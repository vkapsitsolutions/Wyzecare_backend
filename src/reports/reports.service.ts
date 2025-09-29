import { Injectable } from '@nestjs/common';
import { AlertMetricsService } from 'src/alerts/alert-metrics.service';
import { CallMetricsService } from 'src/calls/call-metrics.service';
import { PatientsService } from 'src/patients/patients.service';
import { ReportsDashboardCountQueryDto } from './dto/reports-dahsboard-count-query';
import { GetDailyPerformanceBreakDown } from './dto/daily-performace-query.dto';
import { CallScriptUtilsService } from 'src/call-scripts/call-scripts-utils.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly alertsMetricsService: AlertMetricsService,
    private readonly patientsService: PatientsService,
    private readonly callMetricsService: CallMetricsService,
    private readonly callScriptUtilsService: CallScriptUtilsService,
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

  async getMonthlySuccessRate(organizationId: string) {
    const monthlyCallSuccessRates =
      await this.callMetricsService.getMonthlyCallSuccessRates(organizationId);

    return monthlyCallSuccessRates;
  }

  async getDailyPerformanceBreakDown(
    organizationId: string,
    dto: GetDailyPerformanceBreakDown,
  ) {
    const { period } = dto;
    const dailyPerformanceBreakDown =
      await this.callMetricsService.getDailyPerformanceBreakdown(
        organizationId,
        period,
      );

    return dailyPerformanceBreakDown;
  }

  async getScriptPerformanceMetrics(
    organizationId: string,
    query: GetDailyPerformanceBreakDown,
  ) {
    const { period } = query;

    const scriptPerformanceMetrics =
      await this.callScriptUtilsService.getScriptPerformanceMetrics(
        organizationId,
        period,
      );

    return scriptPerformanceMetrics;
  }
}
