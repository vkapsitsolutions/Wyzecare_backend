// New CallsService
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, MoreThanOrEqual, Repository } from 'typeorm';
import { Call } from './entities/call.entity'; // Adjust path
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallStatus } from './enums/calls.enum';
import { User } from 'src/users/entities/user.entity';
import { GetCallsQuery } from './dto/get-today-calls.dto';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { CallRun } from './entities/call-runs.entity';
import { ScheduleStatus } from 'src/call-schedules/enums/call-schedule.enum';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,

    @InjectRepository(CallRun)
    private readonly callRunRepository: Repository<CallRun>,
  ) {}

  async createCallRunFromSchedule(schedule: CallSchedule): Promise<CallRun> {
    if (!schedule.next_scheduled_at) {
      throw new Error('Cannot create call without next_scheduled_at');
    }
    const run = this.callRunRepository.create({
      organization_id: schedule.organization_id,
      schedule_id: schedule.id,
      patient_id: schedule.patient_id,
      script_id: schedule.script_id,
      scheduled_for: schedule.next_scheduled_at,
      status: CallStatus.SCHEDULED,
      allowed_attempts: schedule.max_attempts,
      attempts_count: 0,
    });

    return this.callRunRepository.save(run);
  }

  async createAttemptForRun(
    callRunId: string,
    external_id: string,
  ): Promise<Call> {
    // 1. fetch run (and schedule if needed)
    const callRun = await this.callRunRepository.findOne({
      where: { id: callRunId },
    });
    if (!callRun) throw new NotFoundException('Call run not found');

    // 2. count existing attempts for run to set attempt_number
    const lastAttempt = await this.callRepository.findOne({
      where: { call_run_id: callRunId },
      order: { attempt_number: 'DESC' },
    });

    const nextAttemptNumber = lastAttempt ? lastAttempt.attempt_number + 1 : 1;

    // 3. create attempt row (set status SCHEDULED or IN_PROGRESS depending on your flow)
    const attempt = this.callRepository.create({
      organization_id: callRun.organization_id,
      call_run_id: callRun.id,
      external_id: external_id,
      schedule_id: callRun.schedule_id,
      script_id: callRun.script_id,
      patient_id: callRun.patient_id,
      status: CallStatus.IN_PROGRESS,
      attempt_number: nextAttemptNumber,
    });

    const savedAttempt = await this.callRepository.save(attempt);

    // 4. update attempts_count on run
    await this.callRunRepository.increment(
      { id: callRunId },
      'attempts_count',
      1,
    );

    return savedAttempt;
  }

  async findPendingBySchedule(scheduleId: string): Promise<Call[]> {
    return await this.callRepository.find({
      where: {
        schedule_id: scheduleId,
        status: CallStatus.SCHEDULED,
      },
    });
  }

  async deletePendingBySchedule(scheduleId: string): Promise<void> {
    await this.callRepository.delete({
      schedule_id: scheduleId,
      status: CallStatus.SCHEDULED,
    });
  }

  async syncPendingRunsForSchedule(schedule: CallSchedule) {
    const now = new Date();

    // find pending future runs for this schedule
    const pendingRuns = await this.callRunRepository.find({
      where: {
        schedule_id: schedule.id,
        status: CallStatus.SCHEDULED,
        scheduled_for: MoreThanOrEqual(now),
      },
      order: { scheduled_for: 'ASC' },
    });

    if (schedule.status !== ScheduleStatus.ACTIVE) {
      // cancel/delete pending ones
      if (pendingRuns.length) {
        // Option A: soft-cancel (update status to CANCELLED) — safer
        await this.callRunRepository.update(
          { id: In(pendingRuns.map((r) => r.id)) },
          { status: CallStatus.CANCELLED, updated_at: () => 'now()' },
        );
        // Option B: hard delete (runRepo.delete(...))
      }
      return;
    }

    // schedule is ACTIVE
    // If there's at least one pending run, reconcile it with the schedule
    const nextRun = pendingRuns[0];

    // Decide whether to update or to delete+recreate:
    const shouldRecreate =
      !nextRun ||
      nextRun.scheduled_for.getTime() !==
        (schedule.next_scheduled_at
          ? schedule.next_scheduled_at.getTime()
          : 0) ||
      nextRun.patient_id !== schedule.patient_id ||
      nextRun.script_id !== schedule.script_id ||
      /* other conditions: timezone, time window meta, max_attempts etc. */ false;

    if (!nextRun && schedule.next_scheduled_at) {
      const newRun = this.callRunRepository.create({
        organization_id: schedule.organization_id,
        schedule_id: schedule.id,
        patient_id: schedule.patient_id,
        script_id: schedule.script_id,
        scheduled_for: schedule.next_scheduled_at,
        status: CallStatus.SCHEDULED,
        allowed_attempts: schedule.max_attempts,
        attempts_count: 0,
      });
      await this.callRunRepository.save(newRun);
      return newRun;
    }

    if (shouldRecreate && schedule.next_scheduled_at) {
      // Option: soft-cancel existing run and create new run at new scheduled_for
      await this.callRunRepository.update(
        { id: nextRun.id },
        { status: CallStatus.CANCELLED },
      );
      const recreated = this.callRunRepository.create({
        organization_id: schedule.organization_id,
        schedule_id: schedule.id,
        patient_id: schedule.patient_id,
        script_id: schedule.script_id,
        scheduled_for: schedule.next_scheduled_at,
        status: CallStatus.SCHEDULED,
      });
      await this.callRunRepository.save(recreated);
      return recreated;
    }

    // If nothing critical changed, optionally update a few fields on the run (meta) without changing schedule.
    await this.callRunRepository.update(
      { id: nextRun.id },
      {
        patient_id: schedule.patient_id,
        script_id: schedule.script_id,

        updated_at: () => 'now()',
      },
    );

    return nextRun;
  }

  async listTodaysCalls(
    organizationId: string,
    getCallsQuery: GetCallsQuery, // Reusing the DTO, assume it's GetCallsQuery if separate
    loggedInUser: User,
  ) {
    const { status, page, limit, keyword } = getCallsQuery ?? {};

    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

    // Calculate today's date range in UTC (adjust for timezone if needed, but assuming timestamptz handles it)
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const qb = this.callRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.patient', 'patient')
      .leftJoinAndSelect('call.script', 'script')
      .leftJoinAndSelect('call.schedule', 'schedule')
      .where('call.organization_id = :orgId', { orgId: organizationId })
      .andWhere('call.scheduled_for >= :todayStart', { todayStart })
      .andWhere('call.scheduled_for < :todayEnd', { todayEnd });

    if (status) {
      qb.andWhere('call.status = :status', { status });
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
              });
            // Removed instructions as it's not in Call entity; add if needed via join to schedule
          }),
        );
      });
    }

    // --- ROLE / ACCESS DECISION ---
    const roleSlug = loggedInUser?.role?.slug || null;
    const isAdmin = roleSlug === RoleName.ADMINISTRATOR;

    if (!isAdmin) {
      qb.andWhere(
        `EXISTS (
        SELECT 1 FROM user_patient_access upa
        WHERE upa.patient_id = call.patient_id
          AND upa.user_id = :userId
      )`,
        { userId: loggedInUser.id },
      );
    }

    qb.orderBy('call.scheduled_for', 'ASC')
      .skip((pageNum - 1) * perPage)
      .take(perPage);

    const [calls, total] = await qb.getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    // Compute dashboard counts (completed, unsuccessful, remaining)
    const countQb = this.callRepository
      .createQueryBuilder('call')
      .select('call.status, COUNT(call.id) as count')
      .where('call.organization_id = :orgId', { orgId: organizationId })
      .andWhere('call.scheduled_for >= :todayStart', { todayStart })
      .andWhere('call.scheduled_for < :todayEnd', { todayEnd })
      .groupBy('call.status');

    if (!isAdmin) {
      countQb.andWhere(
        `EXISTS (
        SELECT 1 FROM user_patient_access upa
        WHERE upa.patient_id = call.patient_id
          AND upa.user_id = :userId
      )`,
        { userId: loggedInUser.id },
      );
    }

    const statusCounts = await countQb.getRawMany();

    let completedCallsToday = 0;
    let unsuccessfulCallsToday = 0;
    let remainingCallsToday = 0;

    statusCounts.forEach((row: { call_status: CallStatus; count: string }) => {
      const count = parseInt(row.count, 10);
      switch (row.call_status) {
        case CallStatus.COMPLETED:
          completedCallsToday += count;
          break;
        case CallStatus.FAILED: // Assuming FAILED is in enum for unsuccessful
        case CallStatus.CANCELLED: // Add other failure statuses as needed
          unsuccessfulCallsToday += count;
          break;
        case CallStatus.SCHEDULED:
          remainingCallsToday += count;
          break;
        // Handle 'No Schedule' if it's a status in the enum, e.g.:
        // case CallStatus.NO_SCHEDULE:
        //   remainingCallsToday += count; // or separate if needed
        default:
          // Ignore or categorize other statuses
          break;
      }
    });

    return {
      success: true,
      message: "Today's calls fetched",
      total,
      page: pageNum,
      limit: perPage,
      totalPages,
      completedCallsToday,
      unsuccessfulCallsToday,
      remainingCallsToday,
      data: calls,
    };
  }
}
