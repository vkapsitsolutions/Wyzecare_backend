import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  OrganizationSubscription,
  SubscriptionStatusEnum,
} from '../subscriptions/entities/organization-subscription.entity';
import {
  PaymentHistory,
  PaymentStatusEnum,
} from '../subscriptions/entities/payment-history.entity'; // Adjust path if needed
import { ConfigService } from '@nestjs/config';
import { CallSchedulesService } from 'src/call-schedules/call-schedules.service';

@Injectable()
export class PaymentWebhooksService {
  private readonly logger = new Logger(PaymentWebhooksService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectRepository(OrganizationSubscription)
    private orgSubscriptionsRepo: Repository<OrganizationSubscription>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepo: Repository<PaymentHistory>,

    private readonly callScheduleService: CallSchedulesService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
      { apiVersion: '2025-09-30.clover' },
    );
  }

  async handleWebhookEvent(body: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err) {
      const errorMessage =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : String(err);
      this.logger.error(
        `Webhook signature verification failed: ${errorMessage}`,
      );
      throw err;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (
          session.mode === 'subscription' &&
          session.payment_status === 'paid'
        ) {
          const subscriptionId = session.subscription as string;
          const subscription =
            await this.stripe.subscriptions.retrieve(subscriptionId);
          await this.updateSubscriptionInDb(subscription);
        }
        break;
      }

      // case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await this.updateSubscriptionInDb(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.updateSubscriptionInDb(subscription, true); // Handle cancel
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await this.createPaymentHistory(invoice);
        // Update subscription for renewals
        const subscriptionId = invoice.parent?.subscription_details
          ?.subscription as string | undefined;
        if (subscriptionId) {
          const subscription =
            await this.stripe.subscriptions.retrieve(subscriptionId);
          await this.updateSubscriptionInDb(subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await this.createPaymentHistory(invoice, true);
        // Update status
        const subscriptionId = invoice.parent?.subscription_details
          ?.subscription as string | undefined;
        if (subscriptionId) {
          const sub = await this.orgSubscriptionsRepo.findOne({
            where: { stripe_subscription_id: subscriptionId },
          });
          if (sub) {
            sub.status = SubscriptionStatusEnum.PAST_DUE;
            await this.orgSubscriptionsRepo.save(sub);
          }
        }
        break;
      }

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  private async updateSubscriptionInDb(
    stripeSub: Stripe.Subscription,
    isDeleted = false,
  ) {
    let sub = await this.orgSubscriptionsRepo.findOne({
      where: { stripe_subscription_id: stripeSub.id },
      relations: ['organization', 'subscription_plan'],
    });

    if (!sub) {
      // Fallback to customer ID or metadata
      const stripeCustomerId = stripeSub.customer as string;
      sub = await this.orgSubscriptionsRepo.findOne({
        where: { stripe_customer_id: stripeCustomerId },
        relations: ['organization', 'subscription_plan'],
      });
    }

    if (!sub) {
      const organizationId = stripeSub.metadata?.organization_id;
      if (organizationId) {
        sub = await this.orgSubscriptionsRepo.findOne({
          where: {
            organization_id: organizationId,
            status: SubscriptionStatusEnum.PENDING,
          },
          relations: ['organization', 'subscription_plan'],
        });
        if (sub) {
          sub.stripe_subscription_id = stripeSub.id;
        } else {
          this.logger.warn(
            `No pending subscription found for organization ${organizationId}`,
          );
          return;
        }
      } else {
        this.logger.warn(
          `No matching subscription found for Stripe sub ${stripeSub.id}`,
        );
        return;
      }
    }

    sub.status = this.mapStripeStatusToEnum(stripeSub.status, isDeleted);
    // Access periods from items (new API behavior)
    const item = stripeSub.items?.data?.[0];
    if (item) {
      sub.current_period_start = new Date(item.current_period_start * 1000);
      sub.current_period_end = new Date(item.current_period_end * 1000);
    } else {
      // Fallback if no items (rare)
      sub.current_period_start = new Date(
        stripeSub.billing_cycle_anchor * 1000,
      );
      // Estimate end based on billing cycle (e.g., +1 month for monthly)
      const endDate = new Date(sub.current_period_start);
      endDate.setMonth(endDate.getMonth() + 1); // Assume monthly
      sub.current_period_end = endDate;
    }
    sub.started_at = new Date(stripeSub.created * 1000);
    sub.ends_at = stripeSub.ended_at
      ? new Date(stripeSub.ended_at * 1000)
      : null;
    sub.cancelled_at = stripeSub.canceled_at
      ? new Date(stripeSub.canceled_at * 1000)
      : null;
    sub.auto_renew = !stripeSub.cancel_at_period_end;

    sub.stripe_subscription_id = stripeSub.id;

    // handle active schedules as per the subscription status
    if (sub.status === SubscriptionStatusEnum.ACTIVE) {
      await this.callScheduleService.activatePausedSchedules(
        sub.organization_id,
      );
    } else {
      await this.callScheduleService.pauseActiveSchedules(sub.organization_id);
    }

    await this.orgSubscriptionsRepo.save(sub);
  }

  private async createPaymentHistory(
    invoice: Stripe.Invoice,
    isFailed = false,
  ) {
    const subscriptionId = invoice.parent?.subscription_details
      ?.subscription as string | undefined;
    let sub: OrganizationSubscription | null | undefined;
    if (subscriptionId) {
      sub = await this.orgSubscriptionsRepo.findOne({
        where: { stripe_subscription_id: subscriptionId },
      });
    }
    if (!sub) {
      // Fallback to customer
      const customerId = invoice.customer as string;
      if (customerId) {
        sub = await this.orgSubscriptionsRepo.findOne({
          where: { stripe_customer_id: customerId },
        });
      }
    }
    if (!sub) return;

    const history = this.paymentHistoryRepo.create({
      organization_id: sub.organization_id,
      organization_subscription_id: sub.id,
      amount: invoice.amount_paid / 100, // Convert cents to dollars
      currency: invoice.currency.toUpperCase(),
      status: isFailed ? PaymentStatusEnum.FAILED : PaymentStatusEnum.SUCCEEDED,
      stripe_invoice_id: invoice.id,
      // stripe_payment_intent_id: invoice.payment_intent || null,
      description: invoice.description,
      paid_at:
        invoice.status === 'paid' ? new Date(invoice.created * 1000) : null,
    });

    await this.paymentHistoryRepo.save(history);
  }

  private mapStripeStatusToEnum(
    stripeStatus: Stripe.Subscription.Status,
    isDeleted: boolean,
  ): SubscriptionStatusEnum {
    if (isDeleted) return SubscriptionStatusEnum.CANCELLED;
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatusEnum.ACTIVE;
      case 'trialing':
        return SubscriptionStatusEnum.TRIALING;
      case 'incomplete':
        return SubscriptionStatusEnum.PAST_DUE;
      case 'canceled':
        return SubscriptionStatusEnum.CANCELLED;
      case 'unpaid':
        return SubscriptionStatusEnum.EXPIRED;
      default:
        return SubscriptionStatusEnum.PAUSED; // Fallback
    }
  }
}
