import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallRunStatus, CallStatus } from './enums/calls.enum';
import { CallRun } from './entities/call-runs.entity';
import { ScheduleStatus } from 'src/call-schedules/enums/call-schedule.enum';
import { CallUtilsService } from './call-utils.service';
import { CallWebhookPayload } from 'src/webhooks/types/webhooks-payload';
import { GetPatientCallHistoryDto } from './dto/get-patient-call-history.dto';
import { AlertsService } from 'src/alerts/alerts.service';
import { AlertSeverity } from 'src/alerts/entites/alert.entity';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,

    @InjectRepository(CallRun)
    private readonly callRunRepository: Repository<CallRun>,

    @InjectRepository(CallSchedule)
    private readonly callScheduleRepository: Repository<CallSchedule>,

    private readonly callUtilsService: CallUtilsService,

    private readonly alertsService: AlertsService,
  ) {}

  async createCallRunFromSchedule(schedule: CallSchedule): Promise<CallRun> {
    if (!schedule.next_scheduled_at) {
      throw new Error('Cannot create call without next_scheduled_at');
    }

    // Check if a call run already exists for this schedule and time
    const existingRun = await this.callRunRepository.findOne({
      where: {
        schedule_id: schedule.id,
        scheduled_for: schedule.next_scheduled_at,
        status: CallRunStatus.SCHEDULED,
      },
    });

    if (existingRun) {
      this.logger.log(
        `Call run already exists for schedule ${schedule.id} at ${schedule.next_scheduled_at.toLocaleString()}`,
      );
      return existingRun;
    }

    const run = this.callRunRepository.create({
      organization_id: schedule.organization_id,
      schedule_id: schedule.id,
      patient_id: schedule.patient_id,
      script_id: schedule.script_id,
      scheduled_for: schedule.next_scheduled_at,
      status: CallRunStatus.SCHEDULED,
      allowed_attempts: schedule.max_attempts,
      attempts_count: 0,
    });

    const savedRun = await this.callRunRepository.save(run);
    this.logger.log(
      `Created call run: ${savedRun.id} for schedule: ${schedule.id}`,
    );

    return savedRun;
  }

  async deleteEmptyCallRunsBySchedule(schedule: CallSchedule) {
    const emptyRuns = await this.callRunRepository
      .createQueryBuilder('run')
      .leftJoin('run.calls', 'call')
      .where('run.schedule_id = :scheduleId', { scheduleId: schedule.id })
      .andWhere('call.id IS NULL')
      .andWhere('run.status = :status', { status: CallRunStatus.SCHEDULED })
      .andWhere('run.scheduled_for >= now()')
      .getMany();

    if (!emptyRuns.length) return;

    const ids = emptyRuns.map((r) => r.id);
    await this.callRunRepository.delete({ id: In(ids) });

    this.logger.log(
      `Deleted ${ids.length} empty call runs for schedule: ${schedule.id}`,
    );
  }

  /**
   * Mark a call run as completed and schedule next occurrence if needed
   */
  async completeCallRun(callRun: CallRun) {
    callRun.status = CallRunStatus.COMPLETED;
    await this.callRunRepository.save(callRun);

    // If this was from a recurring schedule, create next occurrence
    if (callRun.schedule && callRun.schedule.status === ScheduleStatus.ACTIVE) {
      await this.scheduleNextOccurrence(callRun);
    }
  }

  /**
   * Schedule next occurrence for a recurring call schedule
   */
  async scheduleNextOccurrence(callRun: CallRun) {
    if (!callRun.schedule_id) return;

    const schedule = await this.callScheduleRepository.findOne({
      where: { id: callRun.schedule_id },
    });

    if (!schedule || schedule.status !== ScheduleStatus.ACTIVE) return;

    try {
      // Update schedule's last_completed and next_scheduled_at
      schedule.last_completed = new Date();
      schedule.next_scheduled_at =
        this.callUtilsService.calculateNextScheduledTime(schedule);

      await this.callScheduleRepository.save(schedule);

      // Create new call run for the next occurrence
      if (schedule.next_scheduled_at) {
        const nextCallRun = this.callRunRepository.create({
          organization_id: schedule.organization_id,
          schedule_id: schedule.id,
          patient_id: schedule.patient_id,
          script_id: schedule.script_id,
          scheduled_for: schedule.next_scheduled_at,
          status: CallRunStatus.SCHEDULED,
          allowed_attempts: schedule.max_attempts,
          attempts_count: 0,
        });

        await this.callRunRepository.save(nextCallRun);
        this.logger.log(
          `Scheduled next call run: ${nextCallRun.id} for ${schedule.next_scheduled_at.toLocaleString()}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to schedule next occurrence for schedule ${schedule.id}: ${error}`,
      );
    }
  }

  async processWebhookEvent(payload: CallWebhookPayload) {
    const { event, call: callData } = payload;

    // Find the call by external_id
    const call = await this.callRepository.findOne({
      where: { external_id: callData.call_id },
      relations: { call_run: true, schedule: true },
    });

    if (!call) {
      this.logger.warn(`Call not found for external_id: ${callData.call_id}`);
      return;
    }

    switch (event) {
      case 'call_started':
        await this.handleCallStarted(call, payload);
        break;

      case 'call_ended':
        await this.handleCallEnded(call, payload);
        break;

      case 'call_analyzed':
        // Store webhook response for debugging/audit purposes
        call.webhook_response = payload;
        await this.handleCallAnalyzed(call, payload);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${String(event)}`);
        break;
    }
  }

  // call started handling
  private async handleCallStarted(
    call: Call,
    webhookPayload: CallWebhookPayload,
  ) {
    const { call: callData } = webhookPayload;
    this.logger.log(`Call started:${call.id}, Status: ${callData.call_status}`);

    call.status = CallStatus.ONGOING;

    if (call.call_run) {
      call.call_run.status = CallRunStatus.IN_PROGRESS;
      await this.callRunRepository.save(call.call_run);
    }
    await this.callRepository.save(call);
  }

  // call ended handling
  private async handleCallEnded(
    call: Call,
    webhookPayload: CallWebhookPayload,
  ) {
    const { call: callData } = webhookPayload;

    call.started_at = callData.start_timestamp
      ? new Date(callData.start_timestamp)
      : new Date();

    call.ended_at = callData.end_timestamp
      ? new Date(callData.end_timestamp)
      : new Date();

    await this.callRepository.save(call);

    this.logger.log(`Call ended: ${call.id}, Status: ${callData.call_status}`);
  }

  private async handleCallAnalyzed(
    call: Call,
    webhookPayload: CallWebhookPayload,
  ) {
    const { call: callData } = webhookPayload;

    this.logger.log(
      `Call analyzed: ${call.id}, Status: ${callData.call_status}`,
    );

    // Map call status from webhook to our enum
    call.status = this.callUtilsService.mapWebhookStatusToCallStatus(
      callData.call_status,
      callData.disconnection_reason,
    );

    if (call.status === CallStatus.ENDED) {
      call.started_at = callData.start_timestamp
        ? new Date(callData.start_timestamp)
        : new Date();

      call.ended_at = callData.end_timestamp
        ? new Date(callData.end_timestamp)
        : new Date();

      if (callData.duration_ms) {
        const ms = Number(callData.duration_ms) || 0;
        call.duration_seconds = Math.floor(ms / 1000); // integer seconds
      }

      if (callData.transcript) {
        call.meta = {
          ...call.meta,
          transcript: callData.transcript,
          transcript_object: callData.transcript_object,
          transcript_with_tool_calls: callData.transcript_with_tool_calls,
        };
      }

      // Store recording URL if available
      if (callData.recording_url) {
        call.meta = {
          ...call.meta,
          recording_url: callData.recording_url,
        };
      }
    }

    // Store any analysis data in meta
    call.meta = {
      ...call.meta,
      analysis: callData.call_analysis || {},
    };

    // Store failure reason if call failed or not connected
    if (
      call.status === CallStatus.ERROR ||
      call.status === CallStatus.NOT_CONNECTED
    ) {
      call.failure_reason =
        callData.disconnection_reason || 'Call ended unexpectedly';
    }

    call.webhook_response = webhookPayload;

    await this.callRepository.save(call);

    // Update call run from call result
    await this.updateCallRunFromCallResult(call);
  }

  private async updateCallRunFromCallResult(call: Call) {
    if (!call.call_run_id) return;

    const callRun = await this.callRunRepository.findOne({
      where: { id: call.call_run_id },
      relations: { schedule: true },
    });

    if (!callRun) return;

    // Determine call run status based on call result
    if (call.status === CallStatus.ENDED) {
      // Call completed successfully
      callRun.total_duration_seconds = call.duration_seconds;
      await this.completeCallRun(callRun);
    } else if (call.status === CallStatus.NOT_CONNECTED) {
      // Handle different types of non-connection
      const reason = call.failure_reason?.toLowerCase() || '';

      let status: CallRunStatus;

      if (reason.includes('dial_busy')) {
        status = CallRunStatus.BUSY;
      } else if (
        reason.includes('dial_no_answer') ||
        reason.includes('voicemail_reached')
      ) {
        status = CallRunStatus.NO_ANSWER;
      } else {
        status = CallRunStatus.FAILED;
      }

      await this.handleFailedCallRun(callRun, status, call);
    } else if (call.status === CallStatus.ERROR) {
      callRun.status = CallRunStatus.FAILED;
      await this.handleFailedCallRun(callRun);
    }
    await this.callRunRepository.save(callRun);
  }

  private async handleFailedCallRun(
    callRun: CallRun,
    status?: CallRunStatus,
    call?: Call,
  ) {
    if (callRun.attempts_count >= (callRun.allowed_attempts || 3)) {
      callRun.status = status || CallRunStatus.FAILED;
      this.logger.log(
        `Call run ${callRun.id} failed after ${callRun.attempts_count} attempts`,
      );

      if (
        callRun.status === CallRunStatus.NO_ANSWER ||
        callRun.status === CallRunStatus.BUSY
      ) {
        // Create alert for no-answer or busy after max attempts
        await this.alertsService.createAlert({
          patientId: callRun.patient_id,
          alertType: 'No Response',
          severity: AlertSeverity.INFORMATIONAL,
          message: `Failed to answer ${callRun.attempts_count} consecutive calls.`,
          callRunId: callRun.id,
          callId: call?.id || null,
          trigger: 'System Generated',
          scriptId: callRun.script_id || null,
        });
      }

      // Schedule next occurrence if this is from a recurring schedule
      await this.scheduleNextOccurrence(callRun);
    } else {
      callRun.status = status || CallRunStatus.FAILED; // Will be retried by the retry logic
      this.logger.log(
        `Call run ${callRun.id} failed, will retry (attempt ${callRun.attempts_count}/${callRun.allowed_attempts})`,
      );
    }

    await this.callRunRepository.save(callRun);
  }

  async getCallHistoryForPatient(
    patientId: string,
    getPatientCallHistoryDto: GetPatientCallHistoryDto,
  ) {
    const { limit, page } = getPatientCallHistoryDto;

    const total = await this.callRunRepository.countBy({
      patient_id: patientId,
    });

    const callRuns = await this.callRunRepository.find({
      where: { patient_id: patientId },
      relations: ['script', 'calls'],
      order: { scheduled_for: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = callRuns.map((run) => ({
      id: run.id,
      script: run.script
        ? {
            id: run.script.id,
            title: run.script.title,
            category: run.script.category,
          }
        : null,
      scheduled_for: run.scheduled_for,
      status: run.status,
      attempts_count: run.attempts_count,
      total_duration_seconds: run.total_duration_seconds,
      calls: run.calls
        .map((call) => ({
          status: call.status,
          attempt_number: call.attempt_number,
          started_at: call.started_at,
          ended_at: call.ended_at,
          duration_seconds: call.duration_seconds,
          failure_reason: call.failure_reason,
        }))
        .sort((a, b) => a.attempt_number - b.attempt_number),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'call history fetched',
      total,
      page: page,
      limit: limit,
      totalPages,
      data,
    };
  }

  async getOneCall(id: string, patientId: string) {
    const callRun = await this.callRunRepository.findOne({
      where: { id, patient_id: patientId },
      relations: { calls: true },
    });

    if (!callRun) {
      throw new NotFoundException('Call not found');
    }

    return { success: true, callRun };
  }

  async getCallByExternalId(externalId: string) {
    const call = await this.callRepository.findOne({
      where: { external_id: externalId },
      relations: { call_run: true },
    });

    return call;
  }
}
