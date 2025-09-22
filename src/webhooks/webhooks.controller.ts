import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import type { CallWebhookPayload } from './types/webhooks-payload';
import { WebhooksService } from './webhooks.service';
import { WebhookSecretGuard } from './guards/webhooks.guard';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('call-event')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(@Body() payload: CallWebhookPayload) {
    this.logger.debug('Webhook POST /webhooks/call-event');
    // Forward payload to service which will publish SSEs for interested events
    await this.webhooksService.handleWebhooks(payload);
    // Respond quickly to the webhook sender
    return { ok: true };
  }

  @Post('alerts')
  @UseGuards(WebhookSecretGuard)
  @HttpCode(HttpStatus.OK)
  receiveAlert(@Body() payload: any) {
    this.logger.debug('Webhook POST /webhooks/alerts');

    this.logger.log(`Received alert: ${JSON.stringify(payload)}`);

    return { ok: true };
  }
}
