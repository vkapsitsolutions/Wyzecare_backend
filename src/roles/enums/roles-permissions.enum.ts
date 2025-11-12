export enum RoleName {
  SUPER_ADMIN = 'super_admin', // super admin of application
  ADMINISTRATOR = 'administrator', // organization administrator
  CARE_COORDINATOR = 'care_coordinator', // organization care coordinator
  VIEWER = 'viewer', // organization viewer
}

export enum Permission {
  VIEW_ALL_PATIENTS = 'view_all_patients',
  EDIT_PATIENTS = 'edit_patients',
  VIEW_REPORTS = 'view_reports',
  MANAGE_ALERTS = 'manage_alerts',
  MANAGE_USERS = 'manage_users',
  SYSTEM_SETTINGS = 'system_settings',
}
