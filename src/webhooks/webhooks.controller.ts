import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  RawBodyRequest,
  Req,
  Headers,
} from '@nestjs/common';
import type { CallWebhookPayload } from './types/webhooks-payload';
import { WebhooksService } from './webhooks.service';
import { WebhookSecretGuard } from './guards/webhooks.guard';
import { AlertWebhookPayload } from './types/alert-webhook-payload';
import { PaymentWebhooksService } from 'src/subscriptions/payment-webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly paymentWebhooksService: PaymentWebhooksService,
  ) {}

  @UseGuards(WebhookSecretGuard)
  @Post('call-event')
  @HttpCode(HttpStatus.OK)
  async receiveCallWebhook(@Body() payload: CallWebhookPayload) {
    this.logger.debug('Webhook POST /webhooks/call-event');
    // Forward payload to service which will publish SSEs for interested events
    await this.webhooksService.handleCallWebhooks(payload);
    // Respond quickly to the webhook sender
    return { ok: true };
  }

  @Post('alerts')
  @UseGuards(WebhookSecretGuard)
  @HttpCode(HttpStatus.OK)
  async receiveAlertWebhook(@Body() payload: AlertWebhookPayload) {
    this.logger.debug('Webhook POST /webhooks/alerts');

    this.logger.log(`Received alert: ${JSON.stringify(payload)}`);

    await this.webhooksService.handleAlertWebhooks(payload);

    return { ok: true };
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleWebhookEvent(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody;
    if (!raw) {
      throw new Error('Raw body is missing from the request');
    }
    await this.paymentWebhooksService.handleWebhookEvent(raw, signature);

    return { ok: true };
  }
}
