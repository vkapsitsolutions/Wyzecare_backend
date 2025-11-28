import {
  Between,
  FindOperator,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Alert, AlertSeverity, AlertStatus } from './entities/alert.entity';
import { AlertHistory } from './entities/alert-history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertMetricsService {
  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(AlertHistory)
    private alertHistoryRepository: Repository<AlertHistory>,
  ) {}

  async getOrganizationAlertMetrics(organizationId: string) {
    const query = `
      WITH alert_metrics AS (
        SELECT 
          a.id,
          a.created_at,
          a.acknowledged_at,
          a.resolved_at,
          EXTRACT(EPOCH FROM (a.acknowledged_at - a.created_at)) * 1000 as response_time_ms,
          EXTRACT(EPOCH FROM (a.resolved_at - a.created_at)) * 1000 as resolve_time_ms
        FROM alerts a 
        WHERE a.organization_id = $1
        AND (a.acknowledged_at IS NOT NULL OR a.resolved_at IS NOT NULL)
      )
      SELECT 
        AVG(response_time_ms) as avg_response_time,
        AVG(resolve_time_ms) as avg_resolve_time,
        COUNT(CASE WHEN response_time_ms IS NOT NULL THEN 1 END) as acknowledged_count,
        COUNT(CASE WHEN resolve_time_ms IS NOT NULL THEN 1 END) as resolved_count
      FROM alert_metrics;
    `;

    const result: Array<{
      avg_response_time: string | null;
      avg_resolve_time: string | null;
      acknowledged_count: string | null;
      resolved_count: string | null;
    }> = await this.alertRepository.query(query, [organizationId]);
    const row = result[0];

    const avgResponseTime = parseFloat(row.avg_response_time ?? '') || 0;
    const avgResolveTime = parseFloat(row.avg_resolve_time ?? '') || 0;

    const activeAlertsCount = await this.alertRepository
      .createQueryBuilder('alert')
      .innerJoin('alert.patient', 'patient')
      .where('alert.organization_id = :orgId', { orgId: organizationId })
      .andWhere('alert.status != :status', { status: AlertStatus.RESOLVED })
      .andWhere('patient.deleted_at IS NULL')
      .getCount();

    return {
      activeAlertsCount,
      avgResponseTime,
      avgResolveTime,
      avgResponseTimeFormatted: this.formatDuration(avgResponseTime),
      avgResolveTimeFormatted: this.formatDuration(avgResolveTime),
    };
  }

  private formatDuration(milliseconds: number): string {
    if (milliseconds === 0) return '0s';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get dashboard counts for total, active (by severity), and resolved alerts.
   * Excludes soft-deleted patients (patients.deleted_at IS NOT NULL).
   */
  async getDashboardCounts(organizationId: string) {
    // total
    const totalAlerts = await this.alertRepository
      .createQueryBuilder('alert')
      .innerJoin('alert.patient', 'patient')
      .where('alert.organization_id = :orgId', { orgId: organizationId })
      .andWhere('patient.deleted_at IS NULL')
      .getCount();

    // resolved
    const resolvedAlerts = await this.alertRepository
      .createQueryBuilder('alert')
      .innerJoin('alert.patient', 'patient')
      .where('alert.organization_id = :orgId', { orgId: organizationId })
      .andWhere('patient.deleted_at IS NULL')
      .andWhere('alert.status = :status', { status: AlertStatus.RESOLVED })
      .getCount();

    // active (not resolved)
    const activeTotal = await this.alertRepository
      .createQueryBuilder('alert')
      .innerJoin('alert.patient', 'patient')
      .where('alert.organization_id = :orgId', { orgId: organizationId })
      .andWhere('patient.deleted_at IS NULL')
      .andWhere('alert.status != :status', { status: AlertStatus.RESOLVED })
      .getCount();

    // active by severity
    const activeCritical = await this.alertRepository
      .createQueryBuilder('alert')
      .innerJoin('alert.patient', 'patient')
      .where('alert.organization_id = :orgId', { orgId: organizationId })
      .andWhere('patient.deleted_at IS NULL')
      .andWhere('alert.status != :status', { status: AlertStatus.RESOLVED })
      .andWhere('alert.severity = :sev', { sev: AlertSeverity.CRITICAL })
      .getCount();

    const activeImportant = await this.alertRepository
      .createQueryBuilder('alert')
      .innerJoin('alert.patient', 'patient')
      .where('alert.organization_id = :orgId', { orgId: organizationId })
      .andWhere('patient.deleted_at IS NULL')
      .andWhere('alert.status != :status', { status: AlertStatus.RESOLVED })
      .andWhere('alert.severity = :sev', { sev: AlertSeverity.IMPORTANT })
      .getCount();

    const activeInformational = await this.alertRepository
      .createQueryBuilder('alert')
      .innerJoin('alert.patient', 'patient')
      .where('alert.organization_id = :orgId', { orgId: organizationId })
      .andWhere('patient.deleted_at IS NULL')
      .andWhere('alert.status != :status', { status: AlertStatus.RESOLVED })
      .andWhere('alert.severity = :sev', { sev: AlertSeverity.INFORMATIONAL })
      .getCount();

    return {
      success: true,
      message: 'Alerts Counts fetched',
      data: {
        totalAlerts,
        activeAlerts: {
          total: activeTotal,
          critical: activeCritical,
          important: activeImportant,
          informational: activeInformational,
        },
        resolvedAlerts,
      },
    };
  }

  async getAlertCountsByDate(
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

    const baseWhere: FindOptionsWhere<Alert> = {
      organization_id: organizationId,
    };

    if (dateCondition) {
      baseWhere.createdAt = dateCondition;
    }

    const totalGenerated = await this.alertRepository.count({
      where: baseWhere,
    });

    const critical = await this.alertRepository.count({
      where: {
        ...baseWhere,
        status: AlertStatus.ACTIVE,
      },
    });

    return {
      totalGenerated,
      critical,
    };
  }

  async getDailyAlerts(organizationId: string, startDate: Date, today: Date) {
    // Alerts for current period
    const alertQb = this.alertRepository
      .createQueryBuilder('alert')
      .select("TO_CHAR(alert.createdAt, 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'alerts')
      .where('alert.organization_id = :organizationId', { organizationId })
      .andWhere('alert.createdAt >= :startDate', { startDate })
      .andWhere('alert.createdAt < :today', { today })
      .groupBy('day');

    const alertResults: { day: string; alerts: string }[] =
      await alertQb.getRawMany();

    return alertResults;
  }
}
