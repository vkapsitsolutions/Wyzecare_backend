import { BadRequestException, Injectable } from '@nestjs/common';
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
import { AlertMetricsService } from 'src/alerts/alert-metrics.service';

@Injectable()
export class CallMetricsService {
  constructor(
    @InjectRepository(CallRun)
    private readonly callRunRepository: Repository<CallRun>,

    private readonly alertMetricsService: AlertMetricsService,
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

  async getMonthlyCallSuccessRates(organizationId: string) {
    const now = new Date();
    const months: {
      monthKey: string;
      monthLabel: string;
      startDate: Date;
      year: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
      const monthKey = `${year}-${monthNum}`;
      const monthLabel = date.toLocaleString('default', { month: 'short' });
      months.push({ monthKey, monthLabel, startDate: date, year });
    }

    const start = months[0].startDate;

    const failedStatuses = [
      CallRunStatus.FAILED,
      CallRunStatus.NO_ANSWER,
      CallRunStatus.BUSY,
    ];
    const allRelevantStatuses = [CallRunStatus.COMPLETED, ...failedStatuses];

    const qb = this.callRunRepository
      .createQueryBuilder('callRun')
      .select("TO_CHAR(callRun.created_at, 'YYYY-MM')", 'month')
      .addSelect(
        'COUNT(CASE WHEN callRun.status = :completed THEN 1 END)',
        'successful',
      )
      .addSelect(
        'COUNT(CASE WHEN callRun.status IN (:...failedStatuses) THEN 1 END)',
        'failed',
      )
      .where('callRun.organization_id = :organizationId', { organizationId })
      .andWhere('callRun.status IN (:...allRelevantStatuses)', {
        allRelevantStatuses,
      })
      .andWhere('callRun.created_at >= :start', { start })
      .setParameter('completed', CallRunStatus.COMPLETED)
      .setParameter('failedStatuses', failedStatuses)
      .groupBy('month');

    const results: { month: string; successful: string; failed: string }[] =
      await qb.getRawMany();

    const monthDataMap = new Map(
      results.map((r) => [
        r.month,
        { successful: Number(r.successful), failed: Number(r.failed) },
      ]),
    );

    const data = months.map((m) => {
      const counts = monthDataMap.get(m.monthKey) || {
        successful: 0,
        failed: 0,
      };
      const total = counts.successful + counts.failed;
      const rate = total > 0 ? (counts.successful / total) * 100 : 0;
      return {
        month: m.monthLabel,
        year: m.year,
        successful: counts.successful,
        failed: counts.failed,
        rate: Math.round(rate * 100) / 100,
      };
    });

    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    let percentageChange: number | null = null;
    if (previous) {
      if (previous.rate > 0) {
        percentageChange = Math.round(
          ((current.rate - previous.rate) / previous.rate) * 100,
        );
      } else if (current.rate > 0) {
        percentageChange = 100;
      }
    }

    const currentMonthLabel = now.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    return {
      success: true,
      message: 'Call success rates fetched',
      data: {
        months: data,
        percentageChange,
        currentMonth: currentMonthLabel,
        currentSuccessful: current.successful,
        currentFailed: current.failed,
      },
    };
  }

  async getDailyPerformanceBreakdown(
    organizationId: string,
    period: number = 7,
  ) {
    if (![7, 14, 30].includes(period)) {
      throw new BadRequestException('Invalid period');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - period);

    const failedStatuses = [
      CallRunStatus.FAILED,
      CallRunStatus.NO_ANSWER,
      CallRunStatus.BUSY,
    ];
    const allRelevantStatuses = [CallRunStatus.COMPLETED, ...failedStatuses];

    // Current period calls
    const qb = this.callRunRepository
      .createQueryBuilder('callRun')
      .select("TO_CHAR(callRun.created_at, 'YYYY-MM-DD')", 'day')
      .addSelect(
        'COUNT(CASE WHEN callRun.status = :completed THEN 1 END)',
        'successful',
      )
      .addSelect(
        'COUNT(CASE WHEN callRun.status IN (:...failedStatuses) THEN 1 END)',
        'failed',
      )
      .addSelect(
        'SUM(CASE WHEN callRun.status = :completed THEN callRun.total_duration_seconds ELSE 0 END)',
        'totalDuration',
      )
      .where('callRun.organization_id = :organizationId', { organizationId })
      .andWhere('callRun.status IN (:...allRelevantStatuses)', {
        allRelevantStatuses,
      })
      .andWhere('callRun.created_at >= :startDate', { startDate })
      .andWhere('callRun.created_at < :today', { today })
      .setParameter('completed', CallRunStatus.COMPLETED)
      .setParameter('failedStatuses', failedStatuses)
      .groupBy('day');

    const callResults: {
      day: string;
      successful: string;
      failed: string;
      totalDuration: string;
    }[] = await qb.getRawMany();

    const callDataMap = new Map(
      callResults.map((r) => [
        r.day,
        {
          successful: Number(r.successful),
          failed: Number(r.failed),
          totalDuration: Number(r.totalDuration || 0),
        },
      ]),
    );

    const alertResults = await this.alertMetricsService.getDailyAlerts(
      organizationId,
      startDate,
      today,
    );

    const alertMap = new Map(
      alertResults.map((r) => [r.day, Number(r.alerts)]),
    );

    // Generate days (most recent first)
    type DayPerformance = {
      label: string;
      successful: number;
      failed: number;
      total: number;
      rate: number;
      avgDuration: number;
      alerts: number;
    };
    const days: DayPerformance[] = [];
    for (let i = 1; i <= period; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayKey = date.toISOString().slice(0, 10);
      const weekday = date.toLocaleString('default', { weekday: 'long' });
      const month = date.getMonth() + 1;
      const dayNum = date.getDate();
      const year = date.getFullYear();
      const label = `${weekday} - ${month}/${dayNum}/${year}`;

      const counts = callDataMap.get(dayKey) || {
        successful: 0,
        failed: 0,
        totalDuration: 0,
      };
      const total = counts.successful + counts.failed;
      const rate =
        total > 0 ? Math.round((counts.successful / total) * 100) : 0;
      const avgDuration =
        counts.successful > 0
          ? Math.round(counts.totalDuration / counts.successful)
          : 0;
      const alerts = alertMap.get(dayKey) || 0;

      days.push({
        label,
        successful: counts.successful,
        failed: counts.failed,
        total,
        rate,
        avgDuration,
        alerts,
      });
    }

    const currentPeriodLabel = `Last ${period} days`;

    return {
      success: true,
      message: 'Daily performance breakdown fetched',
      data: {
        days,
        currentPeriod: currentPeriodLabel,
      },
    };
  }

  async getCallSuccessRatesByScript(scriptId: string, period?: number) {
    let dateCondition = {};
    if (period) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - period);
      dateCondition = {
        created_at: MoreThanOrEqual(startDate),
      };
    }

    const successCallsCount = await this.callRunRepository.count({
      where: {
        script_id: scriptId,
        status: CallRunStatus.COMPLETED,
        ...dateCondition,
      },
    });

    const failedCallsCount = await this.callRunRepository.count({
      where: {
        script_id: scriptId,
        status: In([
          CallRunStatus.FAILED,
          CallRunStatus.BUSY,
          CallRunStatus.NO_ANSWER,
        ]),
        ...dateCondition,
      },
    });

    const total = successCallsCount + failedCallsCount;
    const successRate = total > 0 ? (successCallsCount / total) * 100 : 0;

    return {
      successCallsCount,
      failedCallsCount,
      total,
      successRate, // percentage (0–100)
    };
  }

  async getAvgDurationByScript(scriptId: string, period?: number) {
    let dateCondition = {};
    if (period) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - period);
      dateCondition = {
        created_at: MoreThanOrEqual(startDate),
      };
    }

    const totalCompletedCalls = await this.callRunRepository.count({
      where: {
        script_id: scriptId,
        status: CallRunStatus.COMPLETED,
        ...dateCondition,
      },
    });

    if (totalCompletedCalls === 0) {
      return 0;
    }

    const result: { totalDuration: string | null } =
      (await this.callRunRepository
        .createQueryBuilder('callRun')
        .select('SUM(callRun.total_duration_seconds)', 'totalDuration')
        .where('callRun.script_id = :scriptId', { scriptId })
        .andWhere('callRun.status = :status', {
          status: CallRunStatus.COMPLETED,
        })
        .andWhere(dateCondition)
        .getRawOne()) ?? { totalDuration: '0' };

    const totalDuration = Number(result.totalDuration || 0);

    return Math.round(totalDuration / totalCompletedCalls);
  }
}
