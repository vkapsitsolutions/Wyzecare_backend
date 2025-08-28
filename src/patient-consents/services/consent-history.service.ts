import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsentHistory } from '../entites/consent-history.entity';
import { Repository } from 'typeorm';
import { ConsentActionEnum, ConsentTypeEnum } from '../enums/concents.enum';

interface CreateConsentHistoryPayload {
  consent_type: ConsentTypeEnum;

  action: ConsentActionEnum;

  payload?: Record<string, any>;
}

@Injectable()
export class ConsentHistoryService {
  constructor(
    @InjectRepository(ConsentHistory)
    private readonly repo: Repository<ConsentHistory>,
  ) {}

  async findByPatientId(patientId: string): Promise<{
    success: boolean;
    message: string;
    data: ConsentHistory[];
  }> {
    const consentHistory = await this.repo.find({
      where: { patient_id: patientId },
      relations: ['actor'],
      order: { created_at: 'DESC' },
    });

    return {
      success: true,
      message: 'Consent history retrieved',
      data: consentHistory,
    };
  }

  async create(
    patientId: string,
    payload: CreateConsentHistoryPayload,
    userId: string,
  ): Promise<ConsentHistory> {
    const history = this.repo.create({
      patient_id: patientId,
      ...payload,
      actor_id: userId,
    });
    return this.repo.save(history);
  }
}
