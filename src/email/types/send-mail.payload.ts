import { AlertSeverity } from 'src/alerts/entities/alert.entity';

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

  // ALERT TEMPLATE FIELDS
  recipient_name?: string;
  patient_name?: string;
  alert_type?: string;
  severity?: AlertSeverity | string;
  /** Hex color string (e.g. "#ef4444") */
  severity_color?: string;
  message?: string;
  trigger?: string;
  /** Frontend link to view the alert */
  frontend_url?: string;
  /** ISO 8601 timestamp with offset (e.g. "2025-10-22T14:35:00+05:30") */
  timestamp?: string;
}

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  [AlertSeverity.INFORMATIONAL]: '#3b82f6', // blue-500
  [AlertSeverity.IMPORTANT]: '#f59e0b', // amber-500
  [AlertSeverity.CRITICAL]: '#ef4444', // red-500
};
