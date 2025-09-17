import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { SseController } from './sse.controller';
import { CallsModule } from 'src/calls/calls.module';

@Module({
  imports: [CallsModule],
  controllers: [WebhooksController, SseController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
