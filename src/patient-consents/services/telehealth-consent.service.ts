import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentHistoryService } from './consent-history.service';
import { TelehealthConsent } from '../entites/telehealth-consent.entity';
import { UpdateTelehealthConsentDto } from '../dto/update-telehealth-consent.dto';
import { ConsentActionEnum, ConsentTypeEnum } from '../enums/concents.enum';
import { incrementVersion } from 'src/common/helpers/version-increment';

@Injectable()
export class TelehealthConsentService {
  constructor(
    @InjectRepository(TelehealthConsent)
    private readonly repo: Repository<TelehealthConsent>,
    private readonly consentHistoryService: ConsentHistoryService,
  ) {}

  private findByPatientId(
    patientId: string,
  ): Promise<TelehealthConsent | null> {
    return this.repo.findOne({ where: { patient_id: patientId } });
  }

  async findOneTelehealthConsent(patientId: string) {
    const telehealthConsent = await this.findByPatientId(patientId);

    if (!telehealthConsent) {
      throw new NotFoundException(
        `Telehealth consent not found for patient ID: ${patientId}`,
      );
    }

    return {
      success: true,
      message: 'Telehealth consent retrieved successfully',
      data: telehealthConsent,
    };
  }

  async upsert(
    patientId: string,
    dto: UpdateTelehealthConsentDto,
    userId: string,
  ) {
    let consent = await this.findByPatientId(patientId);
    let action = ConsentActionEnum.UPDATED;

    if (!consent) {
      consent = this.repo.create({
        patient_id: patientId,
        created_by: userId,
      });
      action = ConsentActionEnum.CREATED;
    }

    if (consent.version) {
      dto.version = incrementVersion(consent.version);
    }

    Object.assign(consent, dto);
    const saved = await this.repo.save(consent);

    // Log to consent history
    await this.consentHistoryService.create(
      patientId,
      {
        consent_type: ConsentTypeEnum.TELEHEALTH,
        action,
        payload: saved,
      },
      userId,
    );

    return {
      success: true,
      message: 'Telehealth consent updated successfully',
      data: saved,
    };
  }
}
