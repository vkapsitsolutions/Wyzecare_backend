import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HIPAAAuthorization } from '../entites/hipaa-authorization.entity';
import { Repository } from 'typeorm';
import { ConsentHistoryService } from './consent-history.service';
import { UpdateHipaaAuthorizationDto } from '../dto/update-hipaa-authorization.dto';
import {
  AuthorizedPurpose,
  ConsentActionEnum,
  ConsentTypeEnum,
} from '../enums/concents.enum';
import { incrementVersion } from 'src/common/helpers/version-increment';

@Injectable()
export class HipaaAuthorizationService {
  constructor(
    @InjectRepository(HIPAAAuthorization)
    private readonly repo: Repository<HIPAAAuthorization>,
    private readonly consentHistoryService: ConsentHistoryService,
  ) {}

  private findByPatientId(
    patientId: string,
  ): Promise<HIPAAAuthorization | null> {
    return this.repo.findOne({ where: { patient_id: patientId } });
  }

  async findOneHipaaAuthorization(patientId: string) {
    const hipaaAuthorization = await this.findByPatientId(patientId);

    if (!hipaaAuthorization) {
      throw new NotFoundException(
        `HIPAA authorization not found for patient ID: ${patientId}`,
      );
    }

    return {
      success: true,
      message: 'HIPAA authorization retrieved successfully',
      data: hipaaAuthorization,
    };
  }

  listAuthorizationPurposes() {
    return {
      success: true,
      data: Object.values(AuthorizedPurpose),
    };
  }

  async upsert(
    patientId: string,
    dto: UpdateHipaaAuthorizationDto,
    userId: string,
  ) {
    let authorization = await this.findByPatientId(patientId);
    let action = ConsentActionEnum.UPDATED;

    if (!authorization) {
      authorization = this.repo.create({
        patient_id: patientId,
        created_by: userId,
      });
      action = ConsentActionEnum.CREATED;
    }

    if (authorization.version) {
      dto.version = incrementVersion(authorization.version);
    }

    Object.assign(authorization, dto);

    const saved = await this.repo.save(authorization);

    await this.consentHistoryService.create(
      patientId,
      {
        consent_type: ConsentTypeEnum.HIPAA,
        action,
        payload: saved,
      },
      userId,
    );

    return {
      success: true,
      message: 'HIPAA authorization updated successfully',
      data: saved,
    };
  }
}
