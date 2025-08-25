export enum RoleName {
  SUPER_ADMIN = 'super_admin',
  ADMINISTRATOR = 'administrator',
  CARE_COORDINATOR = 'care_coordinator',
  VIEWER = 'viewer',
}

export enum Permission {
  VIEW_ALL_PATIENTS = 'view_all_patients',
  EDIT_PATIENTS = 'edit_patients',
  VIEW_REPORTS = 'view_reports',
  MANAGE_ALERTS = 'manage_alerts',
  MANAGE_USERS = 'manage_users',
  SYSTEM_SETTINGS = 'system_settings',
}
