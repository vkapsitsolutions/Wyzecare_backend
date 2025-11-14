// src/repricing-logs/repricing-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { RepricingLog } from './entities/repricing-logs.entity';
import { RepricingLogsDto } from './dto/repricing-logs.dto';

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

  async findRepricingLogs(repricingLogsDto: RepricingLogsDto) {
    const { limit = 20, page = 1, keyword, organizationId } = repricingLogsDto;

    const perPage = Math.max(1, Number(limit) || 20);
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * perPage;

    const qb = this.repricingLogRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.admin', 'admin') // includes admin (user)
      .leftJoinAndSelect('r.organization', 'organization') // includes organization
      .orderBy('r.created_at', 'DESC');

    if (organizationId) {
      qb.andWhere('r.organization_id = :orgId', { orgId: organizationId });
    }

    if (keyword && keyword.trim().length > 0) {
      const kw = `%${keyword.trim()}%`;
      qb.andWhere(
        new Brackets((q) => {
          q.where('r.notes ILIKE :kw', { kw })
            .orWhere('admin.first_name ILIKE :kw', { kw })
            .orWhere('admin.last_name ILIKE :kw', { kw })
            .orWhere('admin.email ILIKE :kw', { kw });
        }),
      );
    }

    const [rows, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    // convert decimal strings to numbers if needed and shape response
    // const data = rows.map((r) => ({
    //   id: r.id,
    //   organizationId: r.organizationId,
    //   organization: r.organization
    //     ? {
    //         id: (r.organization as any).id,
    //         // adjust property names if your Organization entity uses different ones
    //         name:
    //           (r.organization as any).name ??
    //           (r.organization as any).organizationName ??
    //           null,
    //       }
    //     : null,
    //   adminId: r.adminId,
    //   admin: r.admin
    //     ? {
    //         id: (r.admin as any).id,
    //         firstName:
    //           (r.admin as any).firstName ?? (r.admin as any).first_name ?? null,
    //         lastName:
    //           (r.admin as any).lastName ?? (r.admin as any).last_name ?? null,
    //         email: (r.admin as any).email ?? null,
    //       }
    //     : null,
    //   oldPriceId: r.oldPriceId ?? null,
    //   // TypeORM often returns DECIMAL as string — coerce to number when present
    //   oldMonthlyPrice:
    //     r.oldMonthlyPrice != null ? Number(r.oldMonthlyPrice) : null,
    //   newMonthlyPrice:
    //     r.newMonthlyPrice != null ? Number(r.newMonthlyPrice) : null,
    //   newPriceId: r.newPriceId,
    //   isActive: r.isActive,
    //   proratedAmountCents:
    //     r.proratedAmountCents != null ? Number(r.proratedAmountCents) : null,
    //   notes: r.notes ?? null,
    //   createdAt: r.created_at,
    // }));

    const totalPages = Math.ceil(total / perPage);

    return {
      success: true,
      message: 'Repricing logs fetched',
      total,
      page: pageNum,
      limit: perPage,
      totalPages,
      data: rows,
    };
  }
}
