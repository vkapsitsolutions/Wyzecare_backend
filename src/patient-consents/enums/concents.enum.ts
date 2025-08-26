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
  EMERGENCY_CONTACTS = 'emergency_contacts',
  DESIGNATED_FAMILY = 'designated_family_members',
  HEALTHCARE_PROVIDERS = 'healthcare_providers',
  PROFESSIONAL_CAREGIVERS = 'professional_caregivers',
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
