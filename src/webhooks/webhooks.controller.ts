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
  HttpException,
  Res,
} from '@nestjs/common';
import type { CallWebhookPayload } from './types/webhooks-payload';
import { WebhooksService } from './webhooks.service';
import { WebhookSecretGuard } from './guards/webhooks.guard';
import { AlertWebhookPayload } from './types/alert-webhook-payload';
import { PaymentWebhooksService } from 'src/subscriptions/payment-webhooks.service';
import { SmsStatus } from 'src/notifications/entities/delivery-status-logs.entity';
import { validateRequest } from 'twilio';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatusLogsService } from 'src/notifications/delivery-logs.service';
import { Request, Response } from 'express';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly paymentWebhooksService: PaymentWebhooksService,
    private readonly configService: ConfigService,
    private readonly deliveryStatusLogsService: DeliveryStatusLogsService,
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

  // Twilio sends POST application/x-www-form-urlencoded
  @Post('twilio/sms-status')
  @HttpCode(200)
  async handleSmsStatus2(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { [key: string]: string },
  ) {
    try {
      const twilioSignature = req.header('X-Twilio-Signature') ?? '';
      const authToken =
        this.configService.getOrThrow<string>('TWILIO_AUTH_TOKEN');
      const baseUrl =
        this.configService.getOrThrow('NODE_ENV') === 'production'
          ? 'https://app.wyze.care'
          : 'https://staging.wyze.care';
      const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/sms-status`;

      // req.body is parsed by bodyParser.urlencoded
      const params = body;

      // Validate signature
      const isValid = validateRequest(
        authToken,
        twilioSignature,
        statusCallbackUrl,
        params,
      );
      if (!isValid) {
        this.logger.warn('Invalid Twilio signature for SMS status callback');
        return res.status(403).send('Invalid signature');
      }

      const {
        MessageSid: sid,
        MessageStatus: status,
        ErrorCode: errorCode,
        ErrorMessage: errorMessage,
      } = body;

      // Map Twilio status to our enum (handle all possible)
      let mappedStatus: SmsStatus;
      switch (status) {
        case 'queued':
          mappedStatus = SmsStatus.QUEUED;
          break;
        case 'sent':
          mappedStatus = SmsStatus.SENT;
          break;
        case 'delivered':
          mappedStatus = SmsStatus.DELIVERED;
          break;
        case 'delivery_unknown':
          mappedStatus = SmsStatus.DELIVERY_UNKNOWN;
          break;
        case 'failed':
        case 'undelivered':
          mappedStatus =
            status === 'failed' ? SmsStatus.FAILED : SmsStatus.UNDELIVERED;
          break;
        default:
          this.logger.warn(`Unknown SMS status: ${status} for SID: ${sid}`);
          return { success: false }; // Ignore unknowns
      }

      const error = errorCode || errorMessage || null;
      const updatedLog = await this.deliveryStatusLogsService.updateStatusBySid(
        sid,
        mappedStatus,
        error,
      );

      if (updatedLog) {
        this.logger.log(
          `Updated SMS status for SID ${sid}: ${status} ${error ? `- Error: ${error}` : ''}`,
        );
      } else {
        this.logger.warn(`No SmsLog found for SID: ${sid}`);
      }

      return { success: true }; // Twilio expects 2xx response
    } catch (error) {
      this.logger.error(
        `Webhook error: ${error instanceof Error ? error.message : error}`,
      );
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
