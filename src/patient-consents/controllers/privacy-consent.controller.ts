import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // Assume auth guard
import { CommunicationPreferencesService } from '../services/communication-preferences.service';
import { ConsentHistoryService } from '../services/consent-history.service';
import { HipaaAuthorizationService } from '../services/hipaa-authorization.service';
import { PrivacyPreferencesService } from '../services/privacy-preferences.service';
import { TelehealthConsentService } from '../services/telehealth-consent.service';
import { UpdateCommunicationPreferencesDto } from '../dto/update-communication-preferences.dto';
import { UpdateHipaaAuthorizationDto } from '../dto/update-hipaa-authorization.dto';
import { UpdatePrivacyPreferencesDto } from '../dto/update-privacy-preferences.dto';
import { UpdateTelehealthConsentDto } from '../dto/update-telehealth-consent.dto';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission } from 'src/roles/enums/roles-permissions.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('patients/:patientId/privacy-consent')
@UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
@RequirePermissions(Permission.EDIT_PATIENTS)
export class PrivacyConsentController {
  constructor(
    private readonly communicationPreferencesService: CommunicationPreferencesService,
    private readonly consentHistoryService: ConsentHistoryService,
    private readonly hipaaAuthorizationService: HipaaAuthorizationService,
    private readonly privacyPreferencesService: PrivacyPreferencesService,
    private readonly telehealthConsentService: TelehealthConsentService,
  ) {}

  // HIPAA Authorization
  @Get('hipaa-authorization')
  async getHipaaAuthorization(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.hipaaAuthorizationService.findOneHipaaAuthorization(patientId);
  }

  @Post('hipaa-authorization')
  async updateHipaaAuthorization(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdateHipaaAuthorizationDto,
    @CurrentUser() loggedInUser: User,
  ) {
    return this.hipaaAuthorizationService.upsert(
      patientId,
      dto,
      loggedInUser.id,
    );
  }

  // Telehealth Consent
  @Get('telehealth-consent')
  async getTelehealthConsent(@Param('patientId') patientId: string) {
    return this.telehealthConsentService.findOneTelehealthConsent(patientId);
  }

  @Post('telehealth-consent')
  async updateTelehealthConsent(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdateTelehealthConsentDto,
    @CurrentUser() loggedInUser: User,
  ) {
    return this.telehealthConsentService.upsert(
      patientId,
      dto,
      loggedInUser.id,
    );
  }

  // Privacy Preferences
  @Get('privacy-preferences')
  async getPrivacyPreferences(@Param('patientId') patientId: string) {
    return this.privacyPreferencesService.findOnePrivacyPreferences(patientId);
  }

  @Post('privacy-preferences')
  async updatePrivacyPreferences(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdatePrivacyPreferencesDto,
    @CurrentUser() loggedInUser: User,
  ) {
    return this.privacyPreferencesService.upsert(
      patientId,
      dto,
      loggedInUser.id,
    );
  }

  // Communication Preferences
  @Get('communication-preferences')
  async getCommunicationPreferences(@Param('patientId') patientId: string) {
    return this.communicationPreferencesService.findOneCommunicationPreference(
      patientId,
    );
  }

  @Post('communication-preferences')
  async updateCommunicationPreferences(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdateCommunicationPreferencesDto,
    @CurrentUser() loggedInUser: User,
  ) {
    return this.communicationPreferencesService.upsert(
      patientId,
      dto,
      loggedInUser.id,
    );
  }

  // Consent History (read-only)
  @Get('consent-history')
  async getConsentHistory(@Param('patientId') patientId: string) {
    return this.consentHistoryService.findByPatientId(patientId);
  }
}
