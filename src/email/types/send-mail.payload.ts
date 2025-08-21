export interface MailPayload {
  // OTP PAYLOAD
  otp?: string;
  // PASSWORD RESET PAYLOAD
  reset_link?: string;

  // COMMON
  expiry_minutes?: number;
  app_name?: string;
  support_email?: string;
  current_year?: number;
}
