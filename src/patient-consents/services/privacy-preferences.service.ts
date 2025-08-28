import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PrivacyPreferences } from '../entites/privacy-preferences.entity';
import { Repository } from 'typeorm';
import { ConsentHistoryService } from './consent-history.service';
import { UpdatePrivacyPreferencesDto } from '../dto/update-privacy-preferences.dto';
import { ConsentActionEnum, ConsentTypeEnum } from '../enums/concents.enum';
import { incrementVersion } from 'src/common/helpers/version-increment';

@Injectable()
export class PrivacyPreferencesService {
  constructor(
    @InjectRepository(PrivacyPreferences)
    private readonly repo: Repository<PrivacyPreferences>,
    private readonly consentHistoryService: ConsentHistoryService,
  ) {}

  private findByPatientId(
    patientId: string,
  ): Promise<PrivacyPreferences | null> {
    return this.repo.findOne({ where: { patient_id: patientId } });
  }

  async findOnePrivacyPreferences(patientId: string) {
    const privacyPreferences = await this.findByPatientId(patientId);

    if (!privacyPreferences) {
      throw new NotFoundException(
        `Privacy preferences not found for patient ID: ${patientId}`,
      );
    }

    return {
      success: true,
      message: 'Privacy preferences retrieved successfully',
      data: privacyPreferences,
    };
  }

  async upsert(
    patientId: string,
    dto: UpdatePrivacyPreferencesDto,
    userId: string,
  ) {
    let preferences = await this.findByPatientId(patientId);
    let action = ConsentActionEnum.UPDATED;

    if (!preferences) {
      preferences = this.repo.create({
        patient_id: patientId,
        created_by: userId,
      });
      action = ConsentActionEnum.CREATED;
    }

    if (preferences.version) {
      dto.version = incrementVersion(preferences.version);
    }

    Object.assign(preferences, dto);
    const saved = await this.repo.save(preferences);

    // Log to consent history
    await this.consentHistoryService.create(
      patientId,
      {
        consent_type: ConsentTypeEnum.PRIVACY_PREFERENCES,
        action,
        payload: saved,
      },
      userId,
    );

    return {
      success: true,
      message: 'Privacy preferences updated successfully',
      data: saved,
    };
  }
}
