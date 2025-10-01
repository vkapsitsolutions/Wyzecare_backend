/** Known event names for this webhook (allow other strings too for forward-compat) */
export type CallEvent = 'call_ended' | 'call_started' | 'call_analyzed';

/** Call medium */
export type CallType = 'phone_call';

/** Call direction */
export type CallDirection = 'inbound' | 'outbound';

/** Common call status values (extended with string for forward-compat) */
export type WebhookCallStatus =
  | 'registered'
  | 'not_connected'
  | 'ongoing'
  | 'ended'
  | 'error';

/** A single transcript segment */
export interface TranscriptSegment {
  /** e.g. 'agent' | 'customer' | 'system' (allow arbitrary values too) */
  speaker?: 'agent' | 'customer' | 'system';
  /** The transcribed text for this segment */
  text: string;
  /** optional epoch ms */
  start_timestamp?: number;
  /** optional epoch ms */
  end_timestamp?: number;
  /** optional confidence score 0..1 */
  confidence?: number;
  /** any additional, provider-specific properties */
  [key: string]: any;
}

/** Represents a tool call made during a transcript segment (used in transcript_with_tool_calls) */
export interface TranscriptToolCall {
  /** tool name or identifier */
  name: string;
  /** input provided to the tool (any shape) */
  input?: any;
  /** output returned by the tool (any shape) */
  output?: any;
  /** timestamp of the tool call (epoch ms) */
  timestamp?: number;
  [key: string]: any;
}

/** Main call object included in the webhook */
export interface CallPayload {
  call_type: CallType;
  from_number: string;
  to_number: string;
  direction: CallDirection;
  call_id: string;
  agent_id?: string; // optional in some flows
  call_status: WebhookCallStatus;
  metadata?: Record<string, any>;
  /** dynamic variables populated for LLM retells, e.g. { customer_name: "John Doe" } */
  retell_llm_dynamic_variables?: Record<string, string>;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  transcript?: string;
  /** parsed transcript (array of segments). Use TranscriptSegment[] when present. */
  transcript_object?: TranscriptSegment[];
  /**
   * transcript entries where some segments include tool-calls.
   * each item typically matches TranscriptSegment and may include a `tool_calls` array.
   */
  transcript_with_tool_calls?: Array<
    TranscriptSegment & { tool_calls?: TranscriptToolCall[] }
  >;
  /** the system may send this when the recording is available */
  recording_url?: string | null;
  opt_out_sensitive_data_storage?: boolean;
  call_analysis?: Record<string, string>;
  wellness_rating?: number;
  [key: string]: any; // allow future fields
}

/** Full webhook payload */
export interface CallWebhookPayload {
  event: CallEvent;
  call: CallPayload;
}
