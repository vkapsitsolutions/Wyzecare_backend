import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { Repository } from 'typeorm';
import { CallRun } from 'src/calls/entities/call-runs.entity';
import { CallRunStatus } from 'src/calls/enums/calls.enum';
import { Alert, AlertSeverity } from 'src/alerts/entities/alert.entity';

export type PatientEngagementRaw = {
  patient_name: string;
  scheduledCalls: number;
  completedCalls: number;
  engagement: number;
  avgWellness: number | null;
  maxSeverity: number;
  latestStatus: string | null;
  lastCallTime: string | null;
};

@Injectable()
export class PatientMetricsService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) {}

  createPatientEngagementQueryBuilder(
    start: Date,
    end: Date,
    organizationId: string,
    page: number,
    limit: number,
  ) {
    const qb = this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.organization_id = :organizationId', { organizationId })
      .select([
        'patient.id AS patientId',
        "CONCAT(patient.firstName, ' ', patient.lastName) AS patient_name",
      ])
      // Scheduled calls
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(cr.id)', 'scheduledCalls')
          .from(CallRun, 'cr')
          .where('cr.patient_id = patient.id')
          .andWhere('cr.scheduled_for BETWEEN :start AND :end', { start, end });
      }, 'scheduledCalls')
      // Completed calls
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(cr.id)', 'completedCalls')
          .from(CallRun, 'cr')
          .where('cr.patient_id = patient.id')
          .andWhere('cr.scheduled_for BETWEEN :start AND :end', { start, end })
          .andWhere('cr.status = :completed', {
            completed: CallRunStatus.COMPLETED,
          });
      }, 'completedCalls')
      // Avg Wellness (assume wellness_score in CallRun, only for completed)
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(cr.wellness_score)', 'avgWellness')
          .from(CallRun, 'cr')
          .where('cr.patient_id = patient.id')
          .andWhere('cr.scheduled_for BETWEEN :start AND :end', { start, end })
          .andWhere('cr.status = :completed', {
            completed: CallRunStatus.COMPLETED,
          });
      }, 'avgWellness')
      // Highest alert severity (map to number for max)
      .addSelect((subQuery) => {
        return subQuery
          .select(
            `MAX(CASE 
            WHEN a.severity = :critical THEN 3 
            WHEN a.severity = :important THEN 2 
            WHEN a.severity = :informational THEN 1 
            ELSE 0 END)`,
            'maxSeverity',
          )
          .from(Alert, 'a')
          .where('a.patient_id = patient.id')
          .andWhere('a.createdAt BETWEEN :start AND :end', { start, end })
          .setParameters({
            critical: AlertSeverity.CRITICAL,
            important: AlertSeverity.IMPORTANT,
            informational: AlertSeverity.INFORMATIONAL,
          });
      }, 'maxSeverity')
      // Subquery for latest call status
      .addSelect((subQuery) => {
        return subQuery
          .select('latestCall.status')
          .from(CallRun, 'latestCall')
          .where('latestCall.patient_id = patient.id')
          .andWhere('latestCall.scheduled_for BETWEEN :start AND :end', {
            start,
            end,
          })
          .orderBy('latestCall.scheduled_for', 'DESC')
          .limit(1);
      }, 'latestStatus')
      // Subquery for last call time
      .addSelect((subQuery) => {
        return subQuery
          .select('latestCall.scheduled_for')
          .from(CallRun, 'latestCall')
          .where('latestCall.patient_id = patient.id')
          .andWhere('latestCall.scheduled_for BETWEEN :start AND :end', {
            start,
            end,
          })
          .orderBy('latestCall.scheduled_for', 'DESC')
          .limit(1);
      }, 'lastCallTime')
      .setParameters({
        completed: CallRunStatus.COMPLETED,
        critical: AlertSeverity.CRITICAL,
        important: AlertSeverity.IMPORTANT,
        informational: AlertSeverity.INFORMATIONAL,
        start,
        end,
      })
      // Pagination
      .offset((page - 1) * limit)
      .limit(limit);

    return qb;
  }
}
