import { Injectable } from '@nestjs/common';
import { AlertMetricsService } from 'src/alerts/alert-metrics.service';
import { CallMetricsService } from 'src/calls/call-metrics.service';
import { PatientsService } from 'src/patients/patients.service';
import { ReportsDashboardCountQueryDto } from './dto/reports-dashboard-count-query';
import { GetDailyPerformanceBreakDown } from './dto/daily-performance-query.dto';
import { CallScriptUtilsService } from 'src/call-scripts/call-scripts-utils.service';
import { PatientEngagementDto } from './dto/patient-engagement.dto';
import {
  PatientEngagementRaw,
  PatientMetricsService,
} from 'src/patients/patient-metrics.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly alertsMetricsService: AlertMetricsService,
    private readonly patientsService: PatientsService,
    private readonly callMetricsService: CallMetricsService,
    private readonly callScriptUtilsService: CallScriptUtilsService,
    private readonly patientMetricsService: PatientMetricsService,
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

  async getPatientEngagement(
    patientEngagementDto: PatientEngagementDto,
    organizationId: string,
  ) {
    const {
      page,
      limit,
      startDate: startInput,
      endDate: endInput,
    } = patientEngagementDto;

    // Default date range: last 7 days
    let start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    if (startInput) {
      start = new Date(startInput);
      start.setHours(0, 0, 0, 0);
    }
    if (endInput) {
      end = new Date(endInput);
      end.setHours(23, 59, 59, 999);
    }

    // Base query on patients
    const qb = this.patientMetricsService.createPatientEngagementQueryBuilder(
      start,
      end,
      organizationId,
      page,
      limit,
    );

    const rawResults: PatientEngagementRaw[] = await qb.getRawMany();
    const total = await qb.getCount(); // For totalPatients

    // Post-process raw results to format as needed
    const patients = rawResults.map((r) => ({
      patientName: r.patient_name,
      calls:
        r.scheduledCalls > 0
          ? `${r.completedCalls}/${r.scheduledCalls}`
          : '0/0',
      engagement:
        r.scheduledCalls > 0
          ? Math.round((r.completedCalls / r.scheduledCalls) * 100)
          : 0,
      avgWellness: r.avgWellness ? `${Math.round(r.avgWellness)}/5` : '-',
      alert:
        r.maxSeverity === 3
          ? 'Critical'
          : r.maxSeverity === 2
            ? 'Important'
            : r.maxSeverity === 1
              ? 'Informational'
              : '-',
      status: r.latestStatus || 'None',
      lastCall: r.lastCallTime
        ? new Date(r.lastCallTime).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          })
        : '-',
    }));

    return {
      success: true,
      message: 'Patient engagement analysis fetched',
      data: {
        patients,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
