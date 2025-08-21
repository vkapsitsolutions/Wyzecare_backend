import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plans.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { OrganizationSubscription } from './entities/organization-subscription.entity';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { UsersModule } from 'src/users/users.module';
import { RolesModule } from 'src/roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, OrganizationSubscription]),
    OrganizationsModule,
    UsersModule,
    RolesModule,
  ],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
