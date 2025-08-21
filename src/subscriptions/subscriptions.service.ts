import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subcription-plans.entity';
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

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,

    @InjectRepository(OrganizationSubscription)
    private readonly orgSubscriptionsRepo: Repository<OrganizationSubscription>,

    private readonly organizationsService: OrganizationsService,
    private readonly userUtilsService: UserUtilsService,
    private readonly rolesService: RolesService,
  ) {}

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

  async purchaseSubscription(loggedInUser: User, planId: string) {
    const { data: plan } = await this.findOne(planId);
    if (!plan) {
      throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
    }

    const organization =
      await this.organizationsService.createOrganization(loggedInUser);

    const existingSubscription = await this.orgSubscriptionsRepo.findOne({
      where: {
        organization: { id: organization.id },
        subscription_plan: { id: plan.id },
        status: SubscriptionStatusEnum.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('Subscription already exists');
    }

    await this.userUtilsService.assignOrganization(loggedInUser, organization);

    const { data: adminRole } = await this.rolesService.findAdministratorRole();

    await this.userUtilsService.assignRole(loggedInUser, adminRole);

    const subscription = this.orgSubscriptionsRepo.create({
      organization,
      subscription_plan: plan,
      status: SubscriptionStatusEnum.ACTIVE,
      started_at: new Date(),
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      billing_cycle: BillingCycleEnum.MONTHLY,
      auto_renew: true,
    });
    await this.orgSubscriptionsRepo.save(subscription);

    return {
      message: 'Subscription purchased successfully',
      subscription,
    };
  }
}
