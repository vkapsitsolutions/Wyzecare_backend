import { Module } from '@nestjs/common';
import { NotificationPreferenceService } from './notification-preferences.service';
import { SmsService } from './sms.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreference } from './entities/notification-preferences.entity';
import { NotificationController } from './notification.controller';
import { DeliveryStatusLog } from './entities/delivery-status-logs.entity';
import { DeliveryStatusLogsService } from './delivery-logs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationPreference, DeliveryStatusLog]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationPreferenceService,
    SmsService,
    DeliveryStatusLogsService,
  ],
  exports: [
    NotificationPreferenceService,
    SmsService,
    DeliveryStatusLogsService,
  ],
})
export class NotificationsModule {}
