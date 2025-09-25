import { Not, Repository } from 'typeorm';
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

    return {
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
   */
  async getDashboardCounts(organizationId: string) {
    const totalAlerts = await this.alertRepository.count({
      where: { organization_id: organizationId },
    });

    const resolvedAlerts = await this.alertRepository.count({
      where: { status: AlertStatus.RESOLVED, organization_id: organizationId },
    });

    const activeTotal = await this.alertRepository.count({
      where: {
        status: Not(AlertStatus.RESOLVED),
        organization_id: organizationId,
      },
    });

    const activeCritical = await this.alertRepository.count({
      where: {
        status: Not(AlertStatus.RESOLVED),
        severity: AlertSeverity.CRITICAL,
        organization_id: organizationId,
      },
    });

    const activeImportant = await this.alertRepository.count({
      where: {
        status: Not(AlertStatus.RESOLVED),
        severity: AlertSeverity.IMPORTANT,
        organization_id: organizationId,
      },
    });

    const activeInformational = await this.alertRepository.count({
      where: {
        status: Not(AlertStatus.RESOLVED),
        severity: AlertSeverity.INFORMATIONAL,
        organization_id: organizationId,
      },
    });

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
}
