import { forwardRef, Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plans.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { OrganizationSubscription } from './entities/organization-subscription.entity';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { UsersModule } from 'src/users/users.module';
import { RolesModule } from 'src/roles/roles.module';
import { CallScriptsModule } from 'src/call-scripts/call-scripts.module';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { CallSchedulesModule } from 'src/call-schedules/call-schedules.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, OrganizationSubscription]),
    OrganizationsModule,
    forwardRef(() => UsersModule),
    RolesModule,
    CallScriptsModule,
    CallSchedulesModule,
    EmailModule,
  ],
  providers: [SubscriptionsService, PaymentWebhooksService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, PaymentWebhooksService],
})
export class SubscriptionsModule {}
