export enum RoleName {
  SUPER_ADMIN = 'super_admin',
  ADMINISTRATOR = 'administrator',
  CARE_COORDINATOR = 'care_coordinator',
  VIEWER = 'viewer',
}

export enum Permission {
  VIEW_ALL_PATIENTS = 'view_all_patients',
  VIEW_ASSIGNED_PATIENTS = 'view_assigned_patients',
  EDIT_PATIENTS = 'edit_patients',
  VIEW_REPORTS = 'view_reports',
  MANAGE_ALERTS = 'manage_alerts',
  MANAGE_USERS = 'manage_users',
  INVITE_USERS = 'invite_users',
  MANAGE_PATIENT_ACCESS = 'manage_patient_access',
  SYSTEM_SETTINGS = 'system_settings',
  MANAGE_CONSENT = 'manage_consent',
  VIEW_HIPAA_LOGS = 'view_hipaa_logs',
  EXPORT_DATA = 'export_data',
  MANAGE_ROLES = 'manage_roles',
}
