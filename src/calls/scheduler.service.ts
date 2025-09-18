import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CallRun } from './entities/call-runs.entity';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { AiCallingService } from 'src/ai-calling/ai-calling.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CallRunStatus, CallStatus } from './enums/calls.enum';
import * as moment from 'moment-timezone';
import { CallUtilsService } from './call-utils.service';
import { CallsService } from './calls.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

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
        .leftJoinAndSelect('patient.medicalInfo', 'medicalInfo')
        .leftJoinAndSelect('run.script', 'script')
        .leftJoinAndSelect('script.questions', 'questions')
        .leftJoinAndSelect('run.schedule', 'schedule')
        .where('run.status = :status', { status: CallRunStatus.SCHEDULED })
        .andWhere('run.scheduled_for <= :now', { now: new Date() })
        .getMany();

      this.logger.log(`Found ${dueCallRuns.length} due call runs`);

      for (const callRun of dueCallRuns) {
        try {
          await this.initiateCallRun(callRun);
        } catch (error) {
          this.logger.error(
            `Error initiating call run ${callRun.id}: ${error}`,
          );
        }
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
    const failedCallRunsQuery = this.callRunRepository
      .createQueryBuilder('run')
      .leftJoinAndSelect('run.patient', 'patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('patient.medicalInfo', 'medicalInfo')
      .leftJoinAndSelect('run.script', 'script')
      .leftJoinAndSelect('script.questions', 'questions')
      .leftJoinAndSelect('run.schedule', 'schedule')
      // correlated subquery for max_ended_at, avoids GROUP BY issues
      .addSelect(
        (subQ) =>
          subQ
            .select('MAX(COALESCE(c2.ended_at, c2.started_at, c2.created_at))')
            .from('calls', 'c2')
            .where('c2.call_run_id = run.id'),
        'max_ended_at',
      )
      .where('run.status IN (:...statuses)', {
        statuses: [
          CallRunStatus.FAILED,
          CallRunStatus.NO_ANSWER,
          CallRunStatus.BUSY,
        ],
      })
      .andWhere('run.attempts_count < COALESCE(run.allowed_attempts, 3)')
      .andWhere('run.attempts_count > 0')
      .andWhere(
        `NOT EXISTS (
         SELECT 1 FROM calls c 
         WHERE c.call_run_id = run.id 
         AND c.status IN (:...activeStatuses)
       )`,
        { activeStatuses: [CallStatus.REGISTERED, CallStatus.ONGOING] },
      );

    // Use getRawAndEntities so we have both entity instances and the raw max_ended_at
    const { entities, raw } =
      (await failedCallRunsQuery.getRawAndEntities()) as {
        entities: CallRun[];
        raw: Array<{ max_ended_at?: string; MAX?: string }>;
      };

    const failedCallRuns = entities.map((ent, idx) => {
      // raw[idx] should contain a field named max_ended_at
      const maxEnded = raw[idx]?.max_ended_at ?? raw[idx]?.MAX ?? null;
      return {
        ...ent,
        max_ended_at: maxEnded,
      } as CallRun & { max_ended_at: string | null };
    });

    this.logger.log(
      `Found ${failedCallRuns.length} potential call runs to retry`,
    );

    for (const callRun of failedCallRuns) {
      const maxEndedAt = callRun.max_ended_at
        ? new Date(callRun.max_ended_at)
        : null;

      const retryInterval = callRun.schedule?.retry_interval_minutes ?? 5;

      // Defensive: if there is no call timestamp, skip rather than treating as "now"
      if (!maxEndedAt) {
        this.logger.debug(
          `Skipping retry for run ${callRun.id} because no call timestamps were found`,
        );
        continue;
      }

      const retryDue = moment(maxEndedAt)
        .add(retryInterval, 'minutes')
        .toDate();

      this.logger.debug(
        `run=${callRun.id} maxEndedAt=${maxEndedAt.toISOString()} retryInterval=${retryInterval} retryDue=${retryDue.toISOString()}`,
      );

      if (new Date() >= retryDue) {
        try {
          await this.retryCallRun(callRun);
        } catch (error) {
          this.logger.error(`Error retrying call run ${callRun.id}: ${error}`);
        }
      }
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
