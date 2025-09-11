// New CallsService
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity'; // Adjust path
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallStatus } from './enums/calls.enum';

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
