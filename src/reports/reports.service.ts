import { Injectable } from '@nestjs/common';
import { AlertMetricsService } from 'src/alerts/alert-metrics.service';
import { CallMetricsService } from 'src/calls/call-metrics.service';
import { PatientsService } from 'src/patients/patients.service';
import { ReportsDashboardCountQueryDto } from './dto/reports-dahsboard-count-query';

@Injectable()
export class ReportsService {
  constructor(
    private readonly alertsMetricsService: AlertMetricsService,
    private readonly patientsService: PatientsService,
    private readonly callMetricsService: CallMetricsService,
  ) {}

  async getOrganizationMetrics(organizationId: string) {
    const alertMetrics =
      await this.alertsMetricsService.getOrganizationAlertMetrics(
        organizationId,
      );

    const patientsCount =
      await this.patientsService.getPatientCount(organizationId);

    const callMetrics =
      await this.callMetricsService.getOrganizationCallMetrics(organizationId);

    return {
      alertMetrics,
      patientsCount,
      callMetrics,
    };
  }

  async getReportsDashboardCount(
    organizationId: string,
    queryDto: ReportsDashboardCountQueryDto,
  ) {
    const { startDate, endDate } = queryDto;
    const { totalCalls } =
      await this.callMetricsService.getOrganizationCallMetrics(
        organizationId,
        startDate,
        endDate,
      );

    const callSuccessRatePercent = await this.callMetricsService.getSuccessRate(
      organizationId,
      startDate,
      endDate,
    );

    const averageCallDurationSeconds =
      await this.callMetricsService.getAverageCallDuration(
        organizationId,
        startDate,
        endDate,
      );

    const alertCounts = await this.alertsMetricsService.getAlertCountsByDate(
      organizationId,
      startDate,
      endDate,
    );

    return {
      totalCalls,
      callSuccessRatePercent,
      averageCallDurationSeconds,
      alertCounts,
    };
  }
}
