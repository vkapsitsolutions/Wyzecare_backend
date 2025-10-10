import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-logs.entity';
import { Brackets, Repository } from 'typeorm';
import { GetAuditLogsDto } from './dto/get-audti-logs.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Logs an audit event. This method is append-only; no updates or deletes are allowed on logs.
   * @param event Partial<AuditLog> containing the details to log.
   */
  async createLog(event: Partial<AuditLog>): Promise<void> {
    try {
      if (!event.organization_id) {
        throw new Error('organization_id is required for audit logs');
      }
      if (event.module_id && !event.module_name) {
        throw new Error('module_name is required when module_id is provided');
      }
      const logEntry = this.auditLogRepo.create(event);
      await this.auditLogRepo.save(logEntry);
      this.logger.log(
        `Audit log created: ${logEntry.action} by actor ${logEntry.actor_id || 'System'} in organization ${logEntry.organization_id}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Failed to create audit log: ${message}`);
    }
  }

  async getAuditLogs(
    filters: GetAuditLogsDto,
    organizationId: string,
  ): Promise<{
    success: boolean;
    message: string;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    data: AuditLog[];
  }> {
    const { limit, page, action, actor_id, start_date, end_date, keyword } =
      filters;

    // parse date filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (start_date) startDate = new Date(start_date);
    if (end_date) endDate = new Date(end_date);

    // clean keyword
    const kw = keyword ? keyword.trim() : null;
    const kwParam = kw ? `%${kw}%` : null;

    // Build QueryBuilder so we can OR across columns & JSON payload
    const qb = this.auditLogRepo
      .createQueryBuilder('audit')
      // join actor if you want to be able to search actor fields (adjust names as needed)
      .leftJoinAndSelect('audit.actor', 'actor')
      .leftJoinAndSelect('audit.organization', 'organization')
      .where('audit.organization_id = :orgId', { orgId: organizationId });

    if (actor_id) {
      qb.andWhere('audit.actor_id = :actorId', { actorId: actor_id });
    }

    if (action) {
      qb.andWhere('audit.action = :action', { action });
    }

    if (startDate && endDate) {
      qb.andWhere('audit.created_at BETWEEN :start AND :end', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
    } else if (startDate) {
      qb.andWhere('audit.created_at >= :start', {
        start: startDate.toISOString(),
      });
    } else if (endDate) {
      qb.andWhere('audit.created_at <= :end', { end: endDate.toISOString() });
    }

    if (kwParam) {
      // Search across several columns. Add/remove columns as appropriate for your entity.
      qb.andWhere(
        new Brackets((qbWhere) => {
          qbWhere
            .where('audit.message ILIKE :kw', { kw: kwParam })
            .orWhere('audit.module_name ILIKE :kw', { kw: kwParam })
            .orWhere('actor.email ILIKE :kw', { kw: kwParam })
            .orWhere('actor.first_name ILIKE :kw', { kw: kwParam })
            .orWhere('actor.last_name ILIKE :kw', { kw: kwParam });
        }),
      );
    }

    // ordering & pagination
    qb.orderBy('audit.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Audit logs fetched',
      total,
      page,
      limit,
      totalPages,
      data,
    };
  }
}
