import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { SseController } from './sse.controller';
import { CallsModule } from 'src/calls/calls.module';
import { AlertsModule } from 'src/alerts/alerts.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    CallsModule,
    AlertsModule,
    SubscriptionsModule,
    NotificationsModule,
  ],
  controllers: [WebhooksController, SseController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
