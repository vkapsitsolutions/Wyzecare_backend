export interface OtpPayload {
  otp: string;
  expiry_minutes: number;
  app_name: string;
  support_email: string;
  current_year: number;
}
