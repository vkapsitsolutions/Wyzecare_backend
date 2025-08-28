import { Module } from '@nestjs/common';
import { ConsentHistoryService } from './services/consent-history.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentHistory } from './entites/consent-history.entity';
import { CommunicationPreferencesService } from './services/communication-preferences.service';
import { CommunicationPreferences } from './entites/communication-preferences.entity';
import { HipaaAuthorizationService } from './services/hipaa-authorization.service';
import { HIPAAAuthorization } from './entites/hipaa-authorization.entity';
import { PrivacyPreferences } from './entites/privacy-preferences.entity';
import { PrivacyPreferencesService } from './services/privacy-preferences.service';
import { PrivacyConsentController } from './controllers/privacy-consent.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RolesModule } from 'src/roles/roles.module';
import { TelehealthConsentService } from './services/telehealth-consent.service';
import { TelehealthConsent } from './entites/telehealth-consent.entity';
import { PatientEmergencyContact } from 'src/patients/entities/patient-emergency-contact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsentHistory,
      CommunicationPreferences,
      HIPAAAuthorization,
      PrivacyPreferences,
      TelehealthConsent,
      PatientEmergencyContact,
    ]),
    SubscriptionsModule,
    RolesModule,
  ],
  providers: [
    ConsentHistoryService,
    CommunicationPreferencesService,
    HipaaAuthorizationService,
    PrivacyPreferencesService,
    TelehealthConsentService,
  ],
  controllers: [PrivacyConsentController],
  exports: [HipaaAuthorizationService],
})
export class PatientConsentsModule {}
