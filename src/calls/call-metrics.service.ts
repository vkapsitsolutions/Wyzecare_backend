import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOperator,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { CallRun } from './entities/call-runs.entity';
import { CallRunStatus } from './enums/calls.enum';

@Injectable()
export class CallMetricsService {
  constructor(
    @InjectRepository(CallRun)
    private readonly callRunRepository: Repository<CallRun>,
  ) {}

  async getOrganizationCallMetrics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    let adjustedStart: Date | undefined;
    let adjustedEnd: Date | undefined;

    if (startDate) {
      adjustedStart = new Date(startDate);
      adjustedStart.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      adjustedEnd = new Date(endDate);
      adjustedEnd.setHours(23, 59, 59, 999);
    }

    let dateCondition: Date | FindOperator<Date> | undefined;
    if (adjustedStart && adjustedEnd) {
      dateCondition = Between(adjustedStart, adjustedEnd);
    } else if (adjustedStart) {
      dateCondition = MoreThanOrEqual(adjustedStart);
    } else if (adjustedEnd) {
      dateCondition = LessThanOrEqual(adjustedEnd);
    }

    const baseWhere: FindOptionsWhere<CallRun> = {
      organization_id: organizationId,
    };

    if (dateCondition) {
      baseWhere.created_at = dateCondition;
    }

    const totalCalls = await this.callRunRepository.count({
      where: baseWhere,
    });

    const completedCalls = await this.callRunRepository.count({
      where: {
        ...baseWhere,
        status: CallRunStatus.COMPLETED,
      },
    });

    const pendingCalls = await this.callRunRepository.count({
      where: {
        ...baseWhere,
        status: CallRunStatus.SCHEDULED,
      },
    });

    const unsuccessfulCalls = await this.callRunRepository.count({
      where: {
        ...baseWhere,
        status: Not(
          In([
            CallRunStatus.COMPLETED,
            CallRunStatus.IN_PROGRESS,
            CallRunStatus.SCHEDULED,
            CallRunStatus.SKIPPED,
          ]),
        ),
      },
    });

    return {
      totalCalls,
      completedCalls,
      pendingCalls,
      unsuccessfulCalls,
    };
  }

  async getSuccessRate(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const { totalCalls, completedCalls, pendingCalls } =
      await this.getOrganizationCallMetrics(organizationId, startDate, endDate);

    if (totalCalls === 0 || totalCalls === pendingCalls) {
      return 0;
    }

    const successRate = (completedCalls / (totalCalls - pendingCalls)) * 100;

    return Math.round(successRate);
  }

  async getAverageCallDuration(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const { completedCalls } = await this.getOrganizationCallMetrics(
      organizationId,
      startDate,
      endDate,
    );

    if (completedCalls === 0) {
      return 0;
    }

    const totalDuration = await this.getTotalDuration(
      organizationId,
      startDate,
      endDate,
    );

    return Math.round(totalDuration / completedCalls);
  }

  private async getTotalDuration(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    let adjustedStart: Date | undefined;
    let adjustedEnd: Date | undefined;

    if (startDate) {
      adjustedStart = new Date(startDate);
      adjustedStart.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      adjustedEnd = new Date(endDate);
      adjustedEnd.setHours(23, 59, 59, 999);
    }

    const qb = this.callRunRepository
      .createQueryBuilder('callRun')
      .select('SUM(callRun.total_duration_seconds)', 'totalDuration')
      .where('callRun.organization_id = :organizationId', { organizationId })
      .andWhere('callRun.status = :status', {
        status: CallRunStatus.COMPLETED,
      });

    if (adjustedStart && adjustedEnd) {
      qb.andWhere('callRun.created_at BETWEEN :startDate AND :endDate', {
        startDate: adjustedStart,
        endDate: adjustedEnd,
      });
    } else if (adjustedStart) {
      qb.andWhere('callRun.created_at >= :startDate', {
        startDate: adjustedStart,
      });
    } else if (adjustedEnd) {
      qb.andWhere('callRun.created_at <= :endDate', { endDate: adjustedEnd });
    }

    const result: { totalDuration: string | null } = (await qb.getRawOne()) ?? {
      totalDuration: '0',
    };

    return Number(result.totalDuration || 0);
  }
}
