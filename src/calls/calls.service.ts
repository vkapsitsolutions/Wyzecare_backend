// New CallsService
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Call } from './entities/call.entity'; // Adjust path
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallStatus } from './enums/calls.enum';
import { User } from 'src/users/entities/user.entity';
import { GetCallsQuery } from './dto/get-today-calls.dto';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
  ) {}

  async createCallWithSchedule(schedule: CallSchedule): Promise<Call> {
    if (!schedule.next_scheduled_at) {
      throw new Error('Cannot create call without next_scheduled_at');
    }

    const call = this.callRepository.create({
      organization_id: schedule.organization_id,
      schedule_id: schedule.id,
      patient_id: schedule.patient_id,
      script_id: schedule.script_id,
      status: CallStatus.SCHEDULED,
      attempt_number: 1,
      allowed_attempts: schedule.max_attempts,
      scheduled_for: schedule.next_scheduled_at,
    });

    return await this.callRepository.save(call);
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
}
