import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import type { CallWebhookPayload } from './types/webhooks-payload';
import { CallsService } from 'src/calls/calls.service';
import { AlertWebhookPayload } from './types/alert-webhook-payload';
import { AlertsService } from 'src/alerts/alerts.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly callsService: CallsService,
    private readonly alertsService: AlertsService,
  ) {}

  // In-memory Subject used to broadcast events to SSE endpoints
  private readonly events$ = new Subject<CallWebhookPayload>();

  /** allow controllers to subscribe to the events as an observable */
  get eventsStream(): Observable<CallWebhookPayload> {
    return this.events$.asObservable();
  }

  /**
   * Main webhook handler called by controller.
   */
  async handleCallWebhooks(payload: CallWebhookPayload) {
    this.logger.warn(`Received webhook event: ${payload?.event}`);

    // Process only if event is relevant (you can change / extend the list)
    const interested = ['call_started', 'call_ended', 'call_analyzed'];
    if (interested.includes(payload.event)) {
      // for actually handling the call webhooks to update calls and schedules
      await this.callsService.processWebhookEvent(payload);

      this.events$.next(payload);
      this.logger.log(`Emitted SSE for event=${payload.event}`);
    } else {
      this.logger.warn(`Ignored event: ${payload.event}`);
    }
  }

  async handleAlertWebhooks(payload: AlertWebhookPayload) {
    this.logger.warn(`Received alert webhook for call id : ${payload.call_id}`);

    await this.alertsService.processAlertWebhook(payload);
  }
}
