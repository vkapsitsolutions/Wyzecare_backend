import { Module } from '@nestjs/common';
import { NotificationPreferenceService } from './notification-preferences.service';
import { SmsService } from './sms.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreference } from './entities/notification-preferences.entity';
import { NotificationController } from './notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationPreference])],
  controllers: [NotificationController],
  providers: [NotificationPreferenceService, SmsService],
  exports: [NotificationPreferenceService, SmsService],
})
export class NotificationsModule {}
