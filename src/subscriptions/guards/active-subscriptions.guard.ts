import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { SubscriptionsService } from '../subscriptions.service';
import { SubscriptionStatusEnum } from '../entities/organization-subscription.entity';

export class ActiveSubscriptionsGuard implements CanActivate {
  private logger = new Logger(ActiveSubscriptionsGuard.name);
  constructor(
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Express.Request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      this.logger.warn('User not found');
      throw new ForbiddenException('User not found');
    }
    if (!user.organization) {
      this.logger.warn(`User ${user.id} does not belong to any organization`);
      throw new ForbiddenException('User does not belong to any organization');
    }

    const organizationId = user.organization?.id;

    const { subscriptionStatus } =
      await this.subscriptionsService.getSubscriptionStatus(organizationId);

    if (!subscriptionStatus) {
      this.logger.warn(
        `Organization ${organizationId} does not have an active subscription`,
      );
      throw new ForbiddenException(
        'Organization does not have an active subscription',
      );
    }

    if (subscriptionStatus === SubscriptionStatusEnum.ACTIVE) {
      return true;
    }

    throw new ForbiddenException(
      'Organization does not have an active subscription',
    );
  }
}
