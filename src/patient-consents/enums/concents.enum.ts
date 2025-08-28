export enum CommunicationMethodEnum {
  PHONE = 'phone_calls',
  VOICEMAIL = 'voicemail_messages',
  EMAIL = 'email',
  SMS = 'sms',
}

export enum DataRetentionPeriodEnum {
  ONE_YEAR = '1_year',
  THREE_YEARS = '3_years',
  FIVE_YEARS = '5_years',
  SEVEN_YEARS = '7_years',
  TEN_YEARS = '10_years',
}

export enum AuthorizedRecipientEnum {
  EMERGENCY_CONTACTS = 'Emergency contacts',
  DESIGNATED_FAMILY = 'Designated family members',
  HEALTHCARE_PROVIDERS = 'Healthcare providers and specialists',
  PROFESSIONAL_CAREGIVERS = 'Professional caregivers',
}

export enum ConsentActionEnum {
  CREATED = 'created',
  UPDATED = 'updated',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum ConsentTypeEnum {
  HIPAA = 'hipaa_authorization',
  TELEHEALTH = 'telehealth_consent',
  PRIVACY_PREFERENCES = 'privacy_preferences',
  COMMUNICATION_PREFERENCES = 'communication_preferences',
  OTHER = 'other',
}

export enum AuthorizedPurpose {
  TREATMENT_AND_CARE_COORDINATION = 'Treatment and care coordination',
  HEALTHCARE_OPERATIONS = 'Healthcare operations',
  QUALITY_IMPROVEMENT_ACTIVITIES = 'Quality improvement activities',
  WELLNESS_CHECK_CALLS_MONITORING = 'Wellness check calls and monitoring',
  PAYMENT_AND_BILLING_ACTIVITIES = 'Payment and billing activities',
  EMERGENCY_MEDICAL_CARE = 'Emergency medical care',
  CARE_MANAGEMENT_AND_CASE_MANAGEMENT = 'Care management and case management',
  COMMUNICATION_WITH_EMERGENCY_CONTACTS = 'Communication with emergency contacts',
}

export enum HipaaAuthorizationStatus {
  GRANTED = 'Granted',
  NOT_GRANTED = 'Not Granted',
}
