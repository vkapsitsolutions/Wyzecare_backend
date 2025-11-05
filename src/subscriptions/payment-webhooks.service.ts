import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  OrganizationSubscription,
  SubscriptionStatusEnum,
} from '../subscriptions/entities/organization-subscription.entity';
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

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await this.updateSubscriptionInDb(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.updateSubscriptionInDb(subscription, true);
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
      order: { created_at: 'DESC' },
    });

    if (!sub) {
      const stripeCustomerId = stripeSub.customer as string;
      sub = await this.orgSubscriptionsRepo.findOne({
        where: { stripe_customer_id: stripeCustomerId },
        relations: ['organization', 'subscription_plan'],
        order: { created_at: 'DESC' },
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
          order: { created_at: 'DESC' },
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

    // Update subscription status
    sub.status = this.mapStripeStatusToEnum(stripeSub.status, isDeleted);

    // Extract quantity from subscription items (KEY CHANGE)
    const item = stripeSub.items?.data?.[0];

    if (item) {
      // Update licensed patient count from Stripe quantity
      const licensedPatientCount = item.quantity ?? 1;
      sub.organization.licensed_patient_count = licensedPatientCount;

      sub.current_period_start = new Date(item.current_period_start * 1000);
      sub.current_period_end = new Date(item.current_period_end * 1000);

      this.logger.log(
        `Updated subscription for org ${sub.organization_id}: ${licensedPatientCount} licenses`,
      );
    } else {
      // Fallback if no items (rare)
      sub.current_period_start = new Date(
        stripeSub.billing_cycle_anchor * 1000,
      );
      const endDate = new Date(sub.current_period_start);
      endDate.setMonth(endDate.getMonth() + 1);
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

    // Handle active schedules based on subscription status
    if (sub.status === SubscriptionStatusEnum.ACTIVE) {
      await this.callScheduleService.activatePausedSchedules(
        sub.organization_id,
      );
    } else {
      await this.callScheduleService.pauseActiveSchedules(sub.organization_id);
    }

    // Update organization stripe customer ID
    const stripeCustomerId = stripeSub.customer as string;
    sub.organization.stripe_customer_id = stripeCustomerId;

    await this.orgSubscriptionsRepo.save(sub);

    this.logger.log(
      `Subscription updated: org=${sub.organization_id}, status=${sub.status}, licenses=${sub.organization.licensed_patient_count}`,
    );
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
      case 'past_due':
        return SubscriptionStatusEnum.PAST_DUE;
      case 'incomplete':
        return SubscriptionStatusEnum.PAST_DUE;
      case 'incomplete_expired':
        return SubscriptionStatusEnum.EXPIRED;
      case 'canceled':
        return SubscriptionStatusEnum.CANCELLED;
      case 'unpaid':
        return SubscriptionStatusEnum.EXPIRED;
      default:
        return SubscriptionStatusEnum.PAUSED;
    }
  }
}
