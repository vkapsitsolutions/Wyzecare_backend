export interface AlertWebhookPayload {
  call_id: string;
  alert_data: {
    category: string;
    level: string;
    message: string;
  };
}
