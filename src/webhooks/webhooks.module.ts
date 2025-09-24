import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { SseController } from './sse.controller';
import { CallsModule } from 'src/calls/calls.module';
import { AlertsModule } from 'src/alerts/alerts.module';

@Module({
  imports: [CallsModule, AlertsModule],
  controllers: [WebhooksController, SseController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
