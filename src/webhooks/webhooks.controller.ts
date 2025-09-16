import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { CallWebhookPayload } from './types/webhooks-payload';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('call-event')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(@Body() payload: CallWebhookPayload) {
    this.logger.debug('Webhook POST /webhooks');
    // Forward payload to service which will publish SSEs for interested events
    await this.webhooksService.handleWebhooks(payload);
    // Respond quickly to the webhook sender
    return { ok: true };
  }
}
