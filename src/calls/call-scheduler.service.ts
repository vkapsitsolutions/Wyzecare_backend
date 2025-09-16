import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CallRun } from './entities/call-runs.entity';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { AiCallingService } from 'src/ai-calling/ai-calling.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CallRunStatus, CallStatus } from './enums/calls.enum';
import * as moment from 'moment-timezone';
import { CallUtilsService } from './call-utils.servcie';
import { CallsService } from './calls.service';

@Injectable()
export class CallSchedulerService {
  private readonly logger = new Logger(CallSchedulerService.name);

  constructor(
    @InjectRepository(CallRun)
    private readonly callRunRepository: Repository<CallRun>,

    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,

    private readonly aiCallingService: AiCallingService,

    private readonly callUtilsService: CallUtilsService,

    private callsService: CallsService,
  ) {}

  /**
   * Runs every minute to check for scheduled calls that need to be initiated
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCalls() {
    this.logger.log('Processing scheduled calls...');

    try {
      // Find all call runs that are scheduled and due for execution
      const dueCallRuns = await this.callRunRepository
        .createQueryBuilder('run')
        .leftJoinAndSelect('run.patient', 'patient')
        .leftJoinAndSelect('patient.contact', 'contact')
        .leftJoinAndSelect('run.script', 'script')
        .leftJoinAndSelect('run.schedule', 'schedule')
        .where('run.status = :status', { status: CallRunStatus.SCHEDULED })
        .andWhere('run.scheduled_for <= :now', { now: new Date() })
        .getMany();

      this.logger.log(`Found ${dueCallRuns.length} due call runs`);

      for (const callRun of dueCallRuns) {
        await this.initiateCallRun(callRun);
      }

      // Process failed call runs that need retry
      await this.processRetryCallRuns();
    } catch (error) {
      this.logger.error(`Error processing scheduled calls: ${error}`);
    }
  }

  /**
   * Process call runs that failed and need to be retried
   */
  private async processRetryCallRuns() {
    const failedCallRuns = await this.callRunRepository
      .createQueryBuilder('run')
      .leftJoinAndSelect('run.patient', 'patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('run.script', 'script')
      .leftJoinAndSelect('run.schedule', 'schedule')
      .leftJoin('run.calls', 'call')
      .where('run.status IN (:...statuses)', {
        statuses: [
          CallRunStatus.FAILED,
          CallRunStatus.NO_ANSWER,
          CallRunStatus.BUSY,
        ],
      })
      .andWhere('run.attempts_count < run.allowed_attempts')
      .andWhere(
        `
        NOT EXISTS (
          SELECT 1 FROM calls c 
          WHERE c.call_run_id = run.id 
          AND c.status IN (:...activeStatuses)
        )
      `,
        { activeStatuses: [CallStatus.REGISTERED, CallStatus.ONGOING] },
      )
      .groupBy('run.id')
      .addGroupBy('run.organization_id')
      .addGroupBy('run.schedule_id')
      .addGroupBy('run.patient_id')
      .addGroupBy('run.script_id')
      .addGroupBy('run.scheduled_for')
      .addGroupBy('run.status')
      .addGroupBy('run.attempts_count')
      .addGroupBy('run.allowed_attempts')
      .addGroupBy('run.total_duration_seconds')
      .addGroupBy('run.created_at')
      .addGroupBy('run.updated_at')
      .addGroupBy('patient.id')
      .addGroupBy('contact.id')
      .addGroupBy('script.id')
      .addGroupBy('schedule.id')
      .having(
        `
        MAX(call.ended_at) IS NULL OR 
        MAX(call.ended_at) <= :retryTime
      `,
        {
          retryTime: moment().subtract(5, 'minutes').toDate(), // Default retry interval
        },
      )
      .getMany();

    this.logger.log(`Found ${failedCallRuns.length} call runs to retry`);

    for (const callRun of failedCallRuns) {
      await this.retryCallRun(callRun);
    }
  }

  /**
   * Initiate a call run by creating a new call and calling the AI service
   */
  private async initiateCallRun(callRun: CallRun) {
    try {
      this.logger.log(`Initiating call run: ${callRun.id}`);

      // Mark call run as in progress
      callRun.status = CallRunStatus.IN_PROGRESS;
      await this.callRunRepository.save(callRun);

      // Create a new call attempt
      const call = await this.createCallAttempt(callRun);

      // Prepare payload for AI calling service
      const payload = this.callUtilsService.prepareCallPayload(callRun);

      // Initiate the call via AI service
      const response = await this.aiCallingService.initiateCall(payload);

      // Extract call_id from response and store as external_id
      const callId = response?.call_id;
      if (callId) {
        call.external_id = callId;
        call.status = CallStatus.ONGOING;
        call.started_at = new Date();
        await this.callRepository.save(call);

        this.logger.log(
          `Call initiated successfully: ${call.id}, External ID: ${callId}`,
        );
      } else {
        throw new Error('No call_id returned from AI service');
      }
    } catch (error) {
      this.logger.error(`Failed to initiate call run ${callRun.id}: ${error}`);
      await this.handleCallFailure(
        callRun,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Retry a failed call run
   */
  private async retryCallRun(callRun: CallRun) {
    try {
      this.logger.log(
        `Retrying call run: ${callRun.id}, attempt: ${callRun.attempts_count + 1}`,
      );

      // Reset status to in progress
      callRun.status = CallRunStatus.IN_PROGRESS;
      await this.callRunRepository.save(callRun);

      // Create a new call attempt
      const call = await this.createCallAttempt(callRun);

      // Prepare payload for AI calling service
      const payload = this.callUtilsService.prepareCallPayload(callRun);

      // Initiate the call via AI service
      const response = await this.aiCallingService.initiateCall(payload);

      // Extract call_id from response and store as external_id
      const callId = response?.call_id;
      if (callId) {
        call.external_id = callId;
        call.status = CallStatus.ONGOING;
        call.started_at = new Date();
        await this.callRepository.save(call);

        this.logger.log(
          `Call retry successful: ${call.id}, External ID: ${callId}`,
        );
      } else {
        throw new Error('No call_id returned from AI service');
      }
    } catch (error) {
      this.logger.error(`Failed to retry call run ${callRun.id}: ${error}`);
      await this.handleCallFailure(
        callRun,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Create a new call attempt for a call run
   */
  private async createCallAttempt(callRun: CallRun): Promise<Call> {
    // Increment attempts count
    callRun.attempts_count += 1;
    await this.callRunRepository.save(callRun);

    // Create new call
    const call = this.callRepository.create({
      call_run_id: callRun.id,
      organization_id: callRun.organization_id,
      schedule_id: callRun.schedule_id,
      patient_id: callRun.patient_id,
      script_id: callRun.script_id,
      status: CallStatus.REGISTERED,
      attempt_number: callRun.attempts_count,
    });

    return await this.callRepository.save(call);
  }

  /**
   * Handle call failure and determine next steps
   */
  private async handleCallFailure(callRun: CallRun, reason: string) {
    // Update the latest call with failure reason
    const latestCall = await this.callRepository.findOne({
      where: { call_run_id: callRun.id },
      order: { created_at: 'DESC' },
    });

    if (latestCall) {
      latestCall.status = CallStatus.ERROR;
      latestCall.failure_reason = reason;
      latestCall.ended_at = new Date();
      await this.callRepository.save(latestCall);
    }

    // Check if we've exhausted all attempts
    if (callRun.attempts_count >= (callRun.allowed_attempts || 3)) {
      callRun.status = CallRunStatus.FAILED;
      this.logger.log(
        `Call run ${callRun.id} failed after ${callRun.attempts_count} attempts`,
      );

      // Schedule next occurrence if this is from a recurring schedule
      await this.callsService.scheduleNextOccurrence(callRun);
    } else {
      callRun.status = CallRunStatus.FAILED; // Will be retried by the retry logic
      this.logger.log(
        `Call run ${callRun.id} failed, will retry (attempt ${callRun.attempts_count}/${callRun.allowed_attempts})`,
      );
    }

    await this.callRunRepository.save(callRun);
  }
}
