import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UploadsModule } from 'src/uploads/uploads.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RepricingLog } from './subscriptions/entities/repricing-logs.entity';
import { RepricingLogService } from './subscriptions/repricing-logs.service';
import { EmailModule } from 'src/email/email.module';
import { UsersModule } from 'src/users/users.module';
import { RepricingLogsController } from './subscriptions/repricing-logs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, RepricingLog]),
    SubscriptionsModule,
    UploadsModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [SuperAdminController, RepricingLogsController],
  providers: [SuperAdminService, RepricingLogService],
})
export class SuperAdminModule {}
