import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, SelectQueryBuilder } from 'typeorm';
import { CallSchedule } from './entities/call-schedule.entity'; // Adjust path to your entity
import { CreateCallScheduleDto } from './dto/create-schedule.dto';
import { User } from 'src/users/entities/user.entity';
import { GetCallSchedulesQuery } from './dto/get-schedules-query.dto';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { UpdateCallScheduleDto } from './dto/update-schedule.dto';
import { PatientsService } from 'src/patients/patients.service';
import { CallScriptUtilsService } from 'src/call-scripts/call-scripts-utils.service';
import * as moment from 'moment-timezone';
import { CallsService } from 'src/calls/calls.service';
import { CallFrequency, ScheduleStatus } from './enums/call-schedule.enum';
import { PatientAccessService } from 'src/patients/patient-access.service';
import { CallRun } from 'src/calls/entities/call-runs.entity';
import { CallRunStatus } from 'src/calls/enums/calls.enum';

export interface GetSchedulesQuery {
  page?: number;
  limit?: number;
  search?: string;
  organizationId: string;
}

export interface ScheduleStats {
  completedToday: number;
  unsuccessfulToday: number;
  remainingToday: number;
}

export interface GetSchedulesResponse {
  success: boolean;
  message: string;
  stats: ScheduleStats;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: any[];
}

@Injectable()
export class CallSchedulesService {
  constructor(
    @InjectRepository(CallSchedule)
    private readonly callScheduleRepository: Repository<CallSchedule>,

    private readonly patientsService: PatientsService,

    private readonly callScriptUtilsService: CallScriptUtilsService,

    private readonly callsService: CallsService,

    private readonly patientAccessService: PatientAccessService,

    @InjectRepository(CallRun)
    private callRunRepository: Repository<CallRun>,
    // @InjectRepository(Call)
    // private callRepository: Repository<Call>,
  ) {}

  async create(
    organizationId: string,
    createCallScheduleDto: CreateCallScheduleDto,
    loggedInUser: User,
  ) {
    const {
      patient_id,
      script_id,
      retry_interval_minutes,
      time_window_start,
      time_window_end,
    } = createCallScheduleDto;

    // Validate retry_interval_minutes if provided
    if (retry_interval_minutes !== undefined && retry_interval_minutes <= 0) {
      throw new BadRequestException(
        'retry_interval_minutes must be greater than 0 if provided',
      );
    }

    // Validate time window logic (start < end)
    const startTime = moment(time_window_start, 'HH:mm');
    const endTime = moment(time_window_end, 'HH:mm');
    if (startTime.isSameOrAfter(endTime)) {
      throw new BadRequestException(
        'time_window_start must be before time_window_end',
      );
    }

    const patientExists = await this.patientsService.checkPatientExists(
      patient_id,
      organizationId,
    );

    if (!patientExists) {
      throw new NotFoundException(`Patient not found with id ${patient_id}`);
    }

    const patientNumberExists =
      await this.patientsService.checkPatientNumberExists(
        patient_id,
        organizationId,
      );

    if (!patientNumberExists) {
      throw new BadRequestException('Patient phone number is not added');
    }

    const { patient } = await this.patientsService.findById(patient_id);
    const hasPatientAccess =
      await this.patientAccessService.canAccessAndEditPatient(
        loggedInUser.id,
        patient,
      );

    if (!hasPatientAccess) {
      throw new ForbiddenException(
        `You don't have access to schedule this call as patient access not provided`,
      );
    }

    const scriptExists = await this.callScriptUtilsService.checkScriptExists(
      script_id,
      organizationId,
    );

    if (!scriptExists) {
      throw new NotFoundException(`Call script not found with id ${script_id}`);
    }

    const schedule = this.callScheduleRepository.create({
      ...createCallScheduleDto,
      organization_id: organizationId,
      created_by_id: loggedInUser.id,
      updated_by_id: loggedInUser.id,
    });

    const scheduleStatus = schedule.status; // ACTIVE | INACTIVE | PAUSED

    if (scheduleStatus === ScheduleStatus.ACTIVE) {
      schedule.next_scheduled_at = this.calculateNextScheduledAt(schedule);
    }

    await this.callScheduleRepository.save(schedule);

    if (scheduleStatus === ScheduleStatus.ACTIVE) {
      // create upcoming call
      await this.callsService.createCallRunFromSchedule(schedule);
    }

    return {
      success: true,
      message: 'Call schedule created successfully',
      data: schedule,
    };
  }

  async listAll(
    organizationId: string,
    getCallSchedulesQuery: GetCallSchedulesQuery,
    loggedInUser: User,
  ) {
    const { status, page, limit, keyword, patientId } =
      getCallSchedulesQuery ?? {};

    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

    const qb = this.callScheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.patient', 'patient')
      .leftJoinAndSelect('schedule.script', 'script')
      .where('schedule.organization_id = :orgId', { orgId: organizationId });

    if (status) {
      qb.andWhere('schedule.status = :status', { status });
    }

    if (patientId) {
      qb.andWhere('schedule.patient_id = :patientId', { patientId });
    }

    const rawKeyword = keyword?.toString().trim();
    if (rawKeyword && rawKeyword.length > 0) {
      const tokens = rawKeyword.split(/\s+/).slice(0, 5); // Limit tokens for safety

      tokens.forEach((token, idx) => {
        const paramName = `kw${idx}`;
        const likeValue = `%${token}%`;

        qb.andWhere(
          new Brackets((qbInner) => {
            qbInner
              .where(`patient.first_name ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`patient.last_name ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`patient.patient_id ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`patient.preferred_name ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`schedule.instructions ILIKE :${paramName}`, {
                [paramName]: likeValue,
              });
          }),
        );
      });
    }

    // --- ROLE / ACCESS DECISION ---
    // Robust role detection (adapted from your patient example):
    const roleSlug = loggedInUser?.role?.slug || null;
    const isAdmin = roleSlug === RoleName.ADMINISTRATOR;

    if (!isAdmin) {
      // Non-admins only see schedules for patients they have access to (via user_patient_access)
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM user_patient_access upa
          WHERE upa.patient_id = schedule.patient_id
            AND upa.user_id = :userId
        )`,
        { userId: loggedInUser.id },
      );
    }

    qb.orderBy('schedule.created_at', 'DESC')
      .skip((pageNum - 1) * perPage)
      .take(perPage);

    const [schedules, total] = await qb.getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return {
      success: true,
      message: 'Call schedules fetched',
      total,
      page: pageNum,
      limit: perPage,
      totalPages,
      data: schedules,
    };
  }

  async findOne(organizationId: string, id: string, loggedInUser: User) {
    const qb = this.callScheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.patient', 'patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('schedule.script', 'script')
      .where('schedule.id = :id', { id })
      .andWhere('schedule.organization_id = :orgId', { orgId: organizationId });

    // Role/access check similar to list
    const roleSlug = loggedInUser?.role?.slug || null;
    const isAdmin = roleSlug === RoleName.ADMINISTRATOR;

    if (!isAdmin) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM user_patient_access upa
          WHERE upa.patient_id = schedule.patient_id
            AND upa.user_id = :userId
        )`,
        { userId: loggedInUser.id },
      );
    }

    const schedule = await qb.getOne();

    if (!schedule) {
      throw new NotFoundException('Call schedule not found');
    }

    return {
      success: true,
      message: 'Call schedule fetched',
      data: schedule,
    };
  }

  async update(
    organizationId: string,
    id: string,
    updateCallScheduleDto: UpdateCallScheduleDto,
    loggedInUser: User,
  ) {
    const schedule = await this.findOneInternal(
      organizationId,
      id,
      loggedInUser,
    );

    const { patient_id, script_id } = updateCallScheduleDto;

    if (patient_id) {
      const patientExists = await this.patientsService.checkPatientExists(
        patient_id,
        organizationId,
      );

      if (!patientExists) {
        throw new NotFoundException(`Patient not found with id ${patient_id}`);
      }

      const patientNumberExists =
        await this.patientsService.checkPatientNumberExists(
          patient_id,
          organizationId,
        );

      if (!patientNumberExists) {
        throw new BadRequestException('Patient phone number is not added');
      }
    }

    if (script_id) {
      const scriptExists = await this.callScriptUtilsService.checkScriptExists(
        script_id,
        organizationId,
      );

      if (!scriptExists) {
        throw new NotFoundException(
          `Call script not found with id ${script_id}`,
        );
      }
    }

    Object.assign(schedule, updateCallScheduleDto);
    schedule.updated_by_id = loggedInUser.id;

    // Handle next_scheduled_at based on (new) status
    if (schedule.status === ScheduleStatus.ACTIVE) {
      // Ensure required fields for active schedules
      if (
        !schedule.timezone ||
        !schedule.time_window_start ||
        !schedule.time_window_end
      ) {
        throw new BadRequestException(
          'timezone, time_window_start, and time_window_end are required for ACTIVE schedules',
        );
      }

      // Validate time window logic (start < end)
      const startTime = moment(schedule.time_window_start, 'HH:mm');
      const endTime = moment(schedule.time_window_end, 'HH:mm');
      if (!startTime.isValid() || !endTime.isValid()) {
        throw new BadRequestException(
          'Invalid time format for time_window_start or time_window_end',
        );
      }
      if (startTime.isSameOrAfter(endTime)) {
        throw new BadRequestException(
          'time_window_start must be before time_window_end',
        );
      }

      // Recalculate only if ACTIVE
      schedule.next_scheduled_at = this.calculateNextScheduledAt(schedule);
    } else {
      // For non-ACTIVE, clear next_scheduled_at
      schedule.next_scheduled_at = null;
    }

    await this.callScheduleRepository.save(schedule);

    // Delete existing pending calls (if any) - always, for consistency on updates
    await this.callsService.deleteEmptyCallRunsBySchedule(schedule);

    // Create a new scheduled call only if status is ACTIVE and next_scheduled_at is set
    if (
      schedule.status === ScheduleStatus.ACTIVE &&
      schedule.next_scheduled_at
    ) {
      await this.callsService.createCallRunFromSchedule(schedule);
    }

    return {
      success: true,
      message: 'Call schedule updated successfully',
      data: schedule,
    };
  }

  async remove(organizationId: string, id: string, loggedInUser: User) {
    const callSchedule = await this.findOneInternal(
      organizationId,
      id,
      loggedInUser,
    );

    callSchedule.deleted_by = loggedInUser;

    await this.callsService.deleteEmptyCallRunsBySchedule(callSchedule);

    await this.callScheduleRepository.save(callSchedule);

    await this.callScheduleRepository.softDelete({ id });

    return {
      success: true,
      message: 'Call schedule deleted successfully',
    };
  }

  // Internal helper for findOne with access checks (returns raw entity)
  private async findOneInternal(
    organizationId: string,
    id: string,
    loggedInUser: User,
  ): Promise<CallSchedule> {
    const qb = this.callScheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.id = :id', { id })
      .andWhere('schedule.organization_id = :orgId', { orgId: organizationId });

    const roleSlug = loggedInUser?.role?.slug || null;
    const isAdmin = roleSlug === RoleName.ADMINISTRATOR;

    if (!isAdmin) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM user_patient_access upa
          WHERE upa.patient_id = schedule.patient_id
            AND upa.user_id = :userId
        )`,
        { userId: loggedInUser.id },
      );
    }

    const schedule = await qb.getOne();

    if (!schedule) {
      throw new NotFoundException('Call schedule not found');
    }

    return schedule;
  }

  private calculateNextScheduledAt(schedule: CallSchedule): Date | null {
    const now = moment.tz(schedule.timezone);
    const [hour, minute] = schedule.time_window_start.split(':').map(Number);
    const candidate = now
      .clone()
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0);

    if (candidate.isSameOrBefore(now)) {
      switch (schedule.frequency) {
        case CallFrequency.DAILY:
          candidate.add(1, 'day');
          break;
        case CallFrequency.WEEKLY:
          candidate.add(1, 'week');
          break;
        case CallFrequency.BI_WEEKLY:
          candidate.add(2, 'weeks');
          break;
        case CallFrequency.MONTHLY:
          candidate.add(1, 'month');
          break;
      }
    }

    // preferred days logic removed as not needed now
    // if (schedule.preferred_days?.length) {
    //   while (!schedule.preferred_days.includes(candidate.day())) {
    //     candidate.add(1, 'day');
    //   }
    // }

    return candidate.toDate();
  }

  async getSchedulesWithStats(
    query: GetSchedulesQuery,
  ): Promise<GetSchedulesResponse> {
    const { page = 1, limit = 10, search, organizationId } = query;

    // Get today's date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate stats for today
    const stats = await this.getTodayStats(organizationId, today, tomorrow);

    // Build main query with complex ordering
    const queryBuilder = this.buildScheduleQuery(organizationId, search, today);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and get results
    const data = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Transform data to match your UI requirements
    const transformedData = await this.transformScheduleData(data, today);

    return {
      success: true,
      message: 'upcoming calls fetched',
      stats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: transformedData,
    };
  }

  private async getTodayStats(
    organizationId: string,
    today: Date,
    tomorrow: Date,
  ): Promise<ScheduleStats> {
    // Get today's completed calls
    const completedToday = await this.callRunRepository
      .createQueryBuilder('cr')
      .where('cr.organization_id = :organizationId', { organizationId })
      .andWhere('cr.scheduled_for >= :today', { today })
      .andWhere('cr.scheduled_for < :tomorrow', { tomorrow })
      .andWhere('cr.status = :status', { status: CallRunStatus.COMPLETED })
      .getCount();

    // Get today's unsuccessful calls (failed, no answer, busy)
    const unsuccessfulToday = await this.callRunRepository
      .createQueryBuilder('cr')
      .where('cr.organization_id = :organizationId', { organizationId })
      .andWhere('cr.scheduled_for >= :today', { today })
      .andWhere('cr.scheduled_for < :tomorrow', { tomorrow })
      .andWhere('cr.status IN (:...statuses)', {
        statuses: [
          CallRunStatus.FAILED,
          CallRunStatus.NO_ANSWER,
          CallRunStatus.BUSY,
          CallRunStatus.CANCELLED,
        ],
      })
      .getCount();

    // Get today's remaining calls (scheduled, in progress)
    const remainingToday = await this.callRunRepository
      .createQueryBuilder('cr')
      .where('cr.organization_id = :organizationId', { organizationId })
      .andWhere('cr.scheduled_for >= :today', { today })
      .andWhere('cr.scheduled_for < :tomorrow', { tomorrow })
      .andWhere('cr.status IN (:...statuses)', {
        statuses: [CallRunStatus.SCHEDULED, CallRunStatus.IN_PROGRESS],
      })
      .getCount();

    return {
      completedToday,
      unsuccessfulToday,
      remainingToday,
    };
  }

  private buildScheduleQuery(
    organizationId: string,
    search?: string,
    today?: Date,
  ): SelectQueryBuilder<CallSchedule> {
    const queryBuilder = this.callScheduleRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.patient', 'patient')
      .leftJoinAndSelect('cs.script', 'script')
      .leftJoinAndSelect('cs.organization', 'organization')
      .leftJoinAndSelect('cs.callRuns', 'callRuns')
      .leftJoinAndSelect('callRuns.calls', 'calls')
      .where('cs.organization_id = :organizationId', { organizationId });

    // Add search functionality
    if (search) {
      queryBuilder.andWhere(
        '(patient.first_name ILIKE :search OR patient.last_name ILIKE :search OR script.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Complex ordering logic
    queryBuilder
      .addSelect(
        `CASE 
          WHEN cs.status = '${ScheduleStatus.INACTIVE}' THEN 4
          WHEN cs.status = '${ScheduleStatus.PAUSED}' THEN 3
          WHEN cs.next_scheduled_at IS NULL THEN 2
          ELSE 1
        END`,
        'priority_order',
      )
      .addSelect(
        `CASE 
          WHEN DATE(cs.next_scheduled_at) = CURRENT_DATE THEN 1
          WHEN DATE(cs.next_scheduled_at) = CURRENT_DATE + INTERVAL '1 day' THEN 2
          WHEN DATE(cs.next_scheduled_at) = CURRENT_DATE + INTERVAL '2 days' THEN 3
          ELSE 4
        END`,
        'date_priority',
      )
      .addSelect(
        `CASE 
          WHEN EXISTS (
            SELECT 1 FROM call_runs cr 
            WHERE cr.schedule_id = cs.id 
            AND DATE(cr.scheduled_for) = CURRENT_DATE 
            AND cr.status = '${CallRunStatus.COMPLETED}'
          ) THEN 1
          WHEN EXISTS (
            SELECT 1 FROM call_runs cr 
            WHERE cr.schedule_id = cs.id 
            AND DATE(cr.scheduled_for) = CURRENT_DATE 
            AND cr.status IN ('${CallRunStatus.SCHEDULED}', '${CallRunStatus.IN_PROGRESS}')
          ) THEN 2
          ELSE 3
        END`,
        'completion_order',
      )
      .orderBy('priority_order', 'ASC')
      .addOrderBy('date_priority', 'ASC')
      .addOrderBy('completion_order', 'ASC')
      .addOrderBy('cs.next_scheduled_at', 'ASC')
      .addOrderBy('cs.created_at', 'DESC');

    return queryBuilder;
  }

  private async transformScheduleData(
    schedules: CallSchedule[],
    today: Date,
  ): Promise<any[]> {
    return Promise.all(
      schedules.map(async (schedule) => {
        // Get the most recent call run for today
        const todayCallRun = await this.callRunRepository
          .createQueryBuilder('cr')
          .leftJoinAndSelect('cr.calls', 'calls')
          .where('cr.schedule_id = :scheduleId', { scheduleId: schedule.id })
          .andWhere('DATE(cr.scheduled_for) = CURRENT_DATE')
          .orderBy('cr.created_at', 'DESC')
          .getOne();

        // Determine status based on call runs and schedule status
        let displayStatus = 'No Schedule';
        let statusClass = 'no-schedule';

        if (schedule.status === ScheduleStatus.ACTIVE) {
          if (todayCallRun) {
            switch (todayCallRun.status) {
              case CallRunStatus.COMPLETED:
                displayStatus = 'Completed';
                statusClass = 'completed';
                break;
              case CallRunStatus.SCHEDULED:
              case CallRunStatus.IN_PROGRESS:
                displayStatus = 'Scheduled';
                statusClass = 'scheduled';
                break;
              case CallRunStatus.FAILED:
              case CallRunStatus.NO_ANSWER:
              case CallRunStatus.BUSY:
              case CallRunStatus.CANCELLED:
                displayStatus = 'Failed';
                statusClass = 'failed';
                break;
              default:
                displayStatus = 'Scheduled';
                statusClass = 'scheduled';
            }
          } else if (schedule.next_scheduled_at) {
            displayStatus = 'Scheduled';
            statusClass = 'scheduled';
          }
        } else if (schedule.status === ScheduleStatus.PAUSED) {
          displayStatus = 'Paused';
          statusClass = 'paused';
        }

        return {
          id: schedule.id,
          patientName: schedule.patient
            ? `${schedule.patient.fullName}`.trim()
            : 'Unknown Patient',
          scriptName: schedule.script?.title || 'No Script',
          scheduledDate: schedule.next_scheduled_at
            ? schedule.next_scheduled_at.toISOString().split('T')[0]
            : null,
          scheduledTime: schedule.next_scheduled_at
            ? schedule.next_scheduled_at
                .toTimeString()
                .split(' ')[0]
                .substring(0, 5)
            : null,
          timezone: schedule.timezone,
          status: displayStatus,
          statusClass,
          frequency: schedule.frequency,
          lastCompleted: schedule.last_completed,
          timeWindow: {
            start: schedule.time_window_start,
            end: schedule.time_window_end,
          },
          preferredDays: schedule.preferred_days,
          maxAttempts: schedule.max_attempts,
          retryInterval: schedule.retry_interval_minutes,
          estimatedDuration: schedule.estimated_duration_seconds,
          instructions: schedule.instructions,
          agentGender: schedule.agent_gender,
          organizationId: schedule.organization_id,
          patientId: schedule.patient_id,
          scriptId: schedule.script_id,
          createdAt: schedule.created_at,
          updatedAt: schedule.updated_at,
        };
      }),
    );
  }
}
