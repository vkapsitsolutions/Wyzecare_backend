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
  org_name?: string; // organization name for invite (alias)
  organization_name?: string; // alternative name used in some templates
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

  // -----------------------
  // Pricing / Billing fields
  // -----------------------

  // IDs / actor info
  admin_name?: string; // legacy platform admin name (if used)
  performed_by_name?: string; // name of the org administrator who performed the action
  performed_by_email?: string; // email/contact of the performing admin

  // Prices — allow string (pre-formatted) or number
  old_monthly_price?: string | number; // prefer pre-formatted string like "49.99"
  new_monthly_price?: string | number;

  // Count / metadata (licenses)
  licensed_patient_count?: number;

  // Add-licenses specific
  added_licenses?: number;
  new_total_licenses?: number;

  // Reduce-licenses specific
  current_licenses?: number;
  new_licenses?: number;
  reduction?: number; // number of licenses reduced
  used_licenses?: number; // currently used licenses in the org (for validation)

  // Effective date for UI/display (ISO date string recommended)
  effective_date?: string; // e.g. "2025-11-12" or ISO string

  // Currency (optional if you want to show currency symbol dynamically)
  currency?: string; // e.g. 'usd', 'USD', '$'
}

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  [AlertSeverity.INFORMATIONAL]: '#3b82f6', // blue-500
  [AlertSeverity.IMPORTANT]: '#f59e0b', // amber-500
  [AlertSeverity.CRITICAL]: '#ef4444', // red-500
};
