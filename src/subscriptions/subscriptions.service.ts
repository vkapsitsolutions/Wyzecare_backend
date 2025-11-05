import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { IsNull, Not, Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plans.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BillingCycleEnum,
  OrganizationSubscription,
  SubscriptionStatusEnum,
} from './entities/organization-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { UserUtilsService } from 'src/users/users-utils.service';
import { RolesService } from 'src/roles/roles.service';
import { CallScriptUtilsService } from 'src/call-scripts/call-scripts-utils.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;
  private stripeSecretKey: string;
  private frontendUrl: string;
  private readonly stripeDiscountId: string | undefined;

  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,

    @InjectRepository(OrganizationSubscription)
    private readonly orgSubscriptionsRepo: Repository<OrganizationSubscription>,

    private readonly organizationsService: OrganizationsService,
    private readonly userUtilsService: UserUtilsService,
    private readonly rolesService: RolesService,
    private readonly callScriptUtilsService: CallScriptUtilsService,
    private readonly configService: ConfigService,
  ) {
    this.stripeSecretKey =
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    this.stripe = new Stripe(this.stripeSecretKey);

    this.stripeDiscountId =
      this.configService.get<string>('STRIPE_DISCOUNT_ID');
  }

  async findAll() {
    const plans = await this.subscriptionPlanRepo.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });

    return {
      success: true,
      message: 'Subscription plans retrieved successfully',
      data: plans,
    };
  }

  async findOne(id: string) {
    const plan = await this.subscriptionPlanRepo.findOne({
      where: { id, is_active: true },
    });

    if (!plan) {
      return {
        success: false,
        message: 'Subscription plan not found',
      };
    }

    return {
      success: true,
      message: 'Subscription plan retrieved successfully',
      data: plan,
    };
  }

  async purchaseSubscription(
    loggedInUser: User,
    planId: string,
    patientLicensesCount: number,
  ) {
    const { data: plan } = await this.findOne(planId);
    if (!plan) {
      throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
    }

    if (!plan.stripe_monthly_price_id) {
      throw new BadRequestException(
        'Stripe price ID not configured for this plan',
      );
    }

    const organization =
      await this.organizationsService.createOrganization(loggedInUser);

    await this.callScriptUtilsService.createDefaultScriptsForOrganization(
      organization.id,
    );

    const existingSubscription = await this.orgSubscriptionsRepo.findOne({
      where: {
        organization_id: organization.id,
        subscription_plan_id: plan.id,
        status: SubscriptionStatusEnum.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('Subscription already active');
    }

    await this.userUtilsService.assignOrganization(loggedInUser, organization);

    const { data: adminRole } = await this.rolesService.findAdministratorRole();

    await this.userUtilsService.assignRole(loggedInUser, adminRole);

    // Create Stripe customer if not exists (assuming one per subscription for simplicity)
    // const pendingExists = await this.orgSubscriptionsRepo.findOne({
    //   where: {
    //     organization_id: organization.id,
    //     subscription_plan_id: plan.id,
    //     status: SubscriptionStatusEnum.PENDING,
    //   },
    // });
    let stripeCustomerId = organization.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: loggedInUser.email, // Assume User has email
        name: loggedInUser.fullName,
        business_name: organization.name,
        metadata: { organization_id: organization.id },
      });
      stripeCustomerId = customer.id;
    }

    await this.organizationsService.setStripeCustomer(
      organization,
      stripeCustomerId,
    );

    // Check for existing pending/paused subscription for this org and plan
    let subscription = await this.orgSubscriptionsRepo.findOne({
      where: {
        organization_id: organization.id,
        subscription_plan_id: plan.id,
        status: SubscriptionStatusEnum.PENDING,
      },
    });

    if (!subscription) {
      // Create pending subscription in DB if not exists
      subscription = this.orgSubscriptionsRepo.create({
        organization,
        subscription_plan: plan,
        status: SubscriptionStatusEnum.PENDING, // Wait for webhook to activate
        started_at: new Date(),
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Initial estimate
        billing_cycle: BillingCycleEnum.MONTHLY,
        auto_renew: true,
        stripe_customer_id: stripeCustomerId,
        // stripe_subscription_id will be set via webhook
      });
    } else {
      // Update existing pending subscription with latest info
      subscription.stripe_customer_id = stripeCustomerId;
      subscription.started_at = new Date();
      subscription.current_period_start = new Date();
      subscription.current_period_end = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );
      subscription.billing_cycle = BillingCycleEnum.MONTHLY;
      subscription.auto_renew = true;
    }
    await this.orgSubscriptionsRepo.save(subscription);

    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];

    if (this.stripeDiscountId) {
      discounts.push({ coupon: this.stripeDiscountId });
    }

    // Create Checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'], // Add more if needed
      line_items: [
        {
          price: plan.stripe_monthly_price_id,
          quantity: patientLicensesCount,
        },
      ],
      discounts: discounts,
      success_url: `${this.frontendUrl}/subscription/success`, // Replace
      cancel_url: `${this.frontendUrl}/subscription/cancel`, // Replace
      metadata: { organization_id: organization.id }, // For webhook reference if needed
    });

    return {
      message: 'Checkout session created. Redirect user to URL.',
      url: session.url,
      subscriptionId: subscription.id, // Optional, for frontend tracking
    };
  }

  /**
   * Get subscription status for an organization
   */
  async getSubscriptionStatus(organizationId: string) {
    const { data: organization } =
      await this.organizationsService.getOneOrganization(organizationId);

    if (!organization) {
      return {
        success: false,
        message: 'User does not belong to any organization',
        subscriptionStatus: null,
      };
    }

    const subscription = await this.orgSubscriptionsRepo.findOne({
      where: {
        organization_id: organization.id,
        status: SubscriptionStatusEnum.ACTIVE,
      },
      relations: {
        subscription_plan: true,
      },
    });

    if (!subscription) {
      return {
        success: false,
        message: 'No active subscription found',
        subscriptionStatus: null,
        subscriptionPlan: null,
      };
    }

    return {
      success: true,
      message: 'Subscription status retrieved successfully',
      data: subscription,
      subscriptionStatus: subscription.status,
    };
  }

  /**
   * Get customer portal URL for managing subscription
   */
  async getCustomerPortalUrl(organizationId: string) {
    const subscription = await this.orgSubscriptionsRepo.findOne({
      where: {
        organization_id: organizationId,
        stripe_customer_id: Not(IsNull()),
      },
      order: { created_at: 'DESC' },
    });

    if (!subscription?.stripe_customer_id) {
      throw new BadRequestException(
        'No Stripe customer found for this organization',
      );
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: this.frontendUrl,
    });

    return {
      success: true,
      message: 'Customer portal URL generated',
      data: {
        url: session.url,
      },
    };
  }
}
