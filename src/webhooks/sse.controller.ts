import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import type { CallWebhookPayload } from './types/webhooks-payload';
import { WebhooksService } from './webhooks.service';

@Controller('sse')
export class SseController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * SSE endpoint clients subscribe to:
   * URL: GET /sse/events
   *
   * Each emitted MessageEvent contains:
   *  - event: payload.event (e.g., 'call_started' | 'call_ended')
   *  - data: full payload.call object (not stringified here, Nest will stringify)
   *
   * Browser client can "addEventListener('call_started', ...)" to receive it.
   */
  @Sse('events')
  events(): Observable<{ event: string; data: any }> {
    return this.webhooksService.eventsStream.pipe(
      filter(
        (p: CallWebhookPayload) =>
          p?.event === 'call_started' || p?.event === 'call_ended',
      ),
      map((payload: CallWebhookPayload) => {
        return {
          event: payload.event, // SSE event name
          data: payload.call ?? payload, // the client gets the call object
        };
      }),
    );
  }
}
