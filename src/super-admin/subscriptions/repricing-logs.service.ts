// src/repricing-logs/repricing-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepricingLog } from './entities/repricing-logs.entity';

export interface CreateRepricingLogPayload {
  organizationId: string;
  adminId?: string;
  oldPriceId?: string;
  oldMonthlyPrice?: number;
  newPriceId: string;
  newMonthlyPrice: number;
  proratedAmountCents?: number;
  notes?: string;
}

@Injectable()
export class RepricingLogService {
  constructor(
    @InjectRepository(RepricingLog)
    private repricingLogRepo: Repository<RepricingLog>,
  ) {}

  async createLog(payload: CreateRepricingLogPayload): Promise<RepricingLog> {
    const log = this.repricingLogRepo.create({
      organizationId: payload.organizationId,
      adminId: payload.adminId,
      oldPriceId: payload.oldPriceId,
      oldMonthlyPrice: payload.oldMonthlyPrice,
      newPriceId: payload.newPriceId,
      newMonthlyPrice: payload.newMonthlyPrice,
      notes: payload.notes,
    });

    return await this.repricingLogRepo.save(log);
  }

  async findByOrganization(
    organizationId: string,
    limit: number = 50,
  ): Promise<RepricingLog[]> {
    return await this.repricingLogRepo.find({
      where: { organizationId },
      relations: ['admin', 'organization'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
