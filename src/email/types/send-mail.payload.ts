export interface MailPayload {
  // OTP PAYLOAD
  otp?: string;

  // PASSWORD RESET PAYLOAD
  reset_link?: string;

  // INVITE / GENERIC TEMPLATE FIELDS
  expiry_days?: number; // e.g. 7 (days) — useful for invites
  expires_at?: string; // ISO date string: "2025-08-28T00:00:00.000Z"
  invite_link?: string; // full URL to accept invite / reset link alternate
  inviter_name?: string; // who invited (display)
  org_name?: string; // organization name for invite
  role?: string; // invited role name

  // COMMON
  expiry_minutes?: number;
  app_name?: string;
  support_email?: string;
  current_year?: number;
}
