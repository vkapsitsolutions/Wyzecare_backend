import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationPreferences } from '../entites/communication-preferences.entity';
import { Repository } from 'typeorm';
import { ConsentHistoryService } from './consent-history.service';
import { UpdateCommunicationPreferencesDto } from '../dto/update-communication-preferences.dto';
import { ConsentActionEnum, ConsentTypeEnum } from '../enums/concents.enum';
import {
  PatientEmergencyContact,
  RelationshipEnum,
} from 'src/patients/entities/patient-emergency-contact.entity';
import { incrementVersion } from 'src/common/helpers/version-increment';

@Injectable()
export class CommunicationPreferencesService {
  constructor(
    @InjectRepository(CommunicationPreferences)
    private readonly repo: Repository<CommunicationPreferences>,
    @InjectRepository(PatientEmergencyContact)
    private readonly emergencyContactRepo: Repository<PatientEmergencyContact>,
    private readonly consentHistoryService: ConsentHistoryService,
  ) {}

  private findByPatientId(
    patientId: string,
  ): Promise<CommunicationPreferences | null> {
    return this.repo.findOne({ where: { patient_id: patientId } });
  }

  async findOneCommunicationPreference(patientId: string) {
    const communicationPreferences = await this.findByPatientId(patientId);

    if (!communicationPreferences) {
      throw new NotFoundException(
        `Communication preferences not found for patient ID: ${patientId}`,
      );
    }

    return {
      success: true,
      message: 'Communication preferences retrieved successfully',
      data: communicationPreferences,
    };
  }

  private findEmergencyContact(
    patientId: string,
    relationShip: RelationshipEnum,
  ) {
    return this.emergencyContactRepo.findOne({
      where: { patient_id: patientId, relationship: relationShip },
    });
  }

  async upsert(
    patientId: string,
    dto: UpdateCommunicationPreferencesDto,
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

    if (dto.preferred_relationship) {
      const emergencyContact = await this.findEmergencyContact(
        patientId,
        dto.preferred_relationship,
      );

      if (emergencyContact) {
        preferences.preferred_contact_id = emergencyContact.id;
      }
    }

    const saved = await this.repo.save(preferences);

    // Log to consent history
    await this.consentHistoryService.create(
      patientId,
      {
        consent_type: ConsentTypeEnum.COMMUNICATION_PREFERENCES,
        action,
        payload: saved,
      },
      userId,
    );

    return {
      success: true,
      message: 'Communication preferences updated successfully',
      data: saved,
    };
  }
}
