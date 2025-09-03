import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import type { CallWebhookPayload } from './types/webhooks-payload';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  // In-memory Subject used to broadcast events to SSE endpoints
  private readonly events$ = new Subject<CallWebhookPayload>();

  /** allow controllers to subscribe to the events as an observable */
  get eventsStream(): Observable<CallWebhookPayload> {
    return this.events$.asObservable();
  }

  /**
   * Main webhook handler called by controller.
   * Emits the incoming payload to subscribers for real-time delivery.
   */
  handleWebhooks(payload: CallWebhookPayload) {
    this.logger.debug(`Received webhook event: ${payload?.event}`);
    // Optionally validate payload here (signature, schema, etc.)

    // Emit only if event is relevant (you can change / extend the list)
    const interested = ['call_started', 'call_ended'];
    if (interested.includes(payload.event)) {
      this.events$.next(payload);
      this.logger.log(`Emitted SSE for event=${payload.event}`);
    } else {
      this.logger.debug(`Ignored event: ${payload.event}`);
    }
  }

  /**
   * Optional: allow manual emit if other parts of the app want to push events.
   */
  emit(payload: CallWebhookPayload) {
    this.events$.next(payload);
  }
}
