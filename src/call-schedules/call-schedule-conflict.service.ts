import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as moment from 'moment-timezone';
import { CallSchedule } from './entities/call-schedule.entity';
import { CallFrequency, ScheduleStatus } from './enums/call-schedule.enum';

interface TimeWindow {
  start: Date;
  end: Date;
}

interface ConflictCheckParams {
  patientId: string;
  frequency: CallFrequency;
  timezone: string;
  startDate: string; // YYYY-MM-DD
  timeWindowStart: string; // HH:mm
  timeWindowEnd: string; // HH:mm
  estimatedDurationSeconds: number;
  maxAttempts: number;
  retryIntervalMinutes: number;
  excludeScheduleId?: string; // For update operations
}

@Injectable()
export class CallScheduleConflictService {
  constructor(
    @InjectRepository(CallSchedule)
    private callScheduleRepository: Repository<CallSchedule>,
  ) {}

  /**
   * Check if a new/updated schedule would conflict with existing schedules
   */
  async checkForConflicts(params: ConflictCheckParams): Promise<void> {
    const {
      patientId,
      frequency,
      timezone,
      startDate,
      timeWindowStart,
      timeWindowEnd,
      estimatedDurationSeconds,
      maxAttempts,
      retryIntervalMinutes,
      excludeScheduleId,
    } = params;

    // Get all active schedules for this patient
    const existingSchedules = await this.callScheduleRepository.find({
      where: {
        patient_id: patientId,
        status: ScheduleStatus.ACTIVE,
      },
    });

    // Filter out the schedule being updated
    const schedulesToCheck = excludeScheduleId
      ? existingSchedules.filter((s) => s.id !== excludeScheduleId)
      : existingSchedules;

    if (schedulesToCheck.length === 0) {
      return; // No conflicts possible
    }

    // Generate potential call times for the new schedule (next 90 days)
    const newScheduleWindows = this.generateCallWindows(
      frequency,
      timezone,
      startDate,
      timeWindowStart,
      timeWindowEnd,
      estimatedDurationSeconds,
      maxAttempts,
      retryIntervalMinutes,
      90, // days to check
    );

    // Check each existing schedule for conflicts
    for (const existingSchedule of schedulesToCheck) {
      const existingWindows = this.generateCallWindows(
        existingSchedule.frequency,
        existingSchedule.timezone,
        existingSchedule.startDate || moment.tz(timezone).format('YYYY-MM-DD'),
        existingSchedule.time_window_start,
        existingSchedule.time_window_end,
        existingSchedule.estimated_duration_seconds,
        existingSchedule.max_attempts,
        existingSchedule.retry_interval_minutes,
        90,
      );

      // Check for any overlapping windows
      const conflict = this.findOverlappingWindows(
        newScheduleWindows,
        existingWindows,
      );

      if (conflict) {
        throw new BadRequestException(
          `Schedule conflict detected: A ${existingSchedule.frequency} call is already scheduled for this patient at ${moment(conflict.existing.start).tz(timezone).format('YYYY-MM-DD HH:mm')} which would overlap with the proposed ${frequency} schedule at ${moment(conflict.new.start).tz(timezone).format('YYYY-MM-DD HH:mm')}. Please adjust the time window or frequency.`,
        );
      }
    }
  }

  /**
   * Generate all potential call time windows for a schedule over a period
   */
  /**
   * Generate all potential call time windows for a schedule over a period
   */
  private generateCallWindows(
    frequency: CallFrequency,
    timezone: string,
    startDate: string,
    timeWindowStart: string,
    timeWindowEnd: string,
    estimatedDurationSeconds: number,
    maxAttempts: number,
    retryIntervalMinutes: number,
    daysToCheck: number,
  ): TimeWindow[] {
    const windows: TimeWindow[] = [];
    const now = moment.tz(timezone);
    const endDate = now.clone().add(daysToCheck, 'days');
    const [hour, minute] = timeWindowStart.split(':').map(Number);

    let currentDate = moment
      .tz(startDate, timezone)
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0);

    // NEW: Direct calculation to skip to first future occurrence (replaces the while loop)
    if (currentDate.isBefore(now)) {
      const initial = currentDate.clone(); // Anchor to original startDate + time
      const delta = now.diff(initial, 'days'); // Days from initial to now

      switch (frequency) {
        case CallFrequency.DAILY:
          // For daily: advance to the next full day after now
          currentDate = now
            .clone()
            .add(1, 'day')
            .hour(hour)
            .minute(minute)
            .second(0)
            .millisecond(0);
          break;
        case CallFrequency.WEEKLY: {
          // For weekly: find weeks from initial to now, round up to next occurrence
          const weeksFromInitial = Math.ceil(delta / 7);
          currentDate = initial.clone().add(weeksFromInitial, 'weeks');
          if (currentDate.isBefore(now)) {
            currentDate.add(1, 'week');
          }
          break;
        }
        case CallFrequency.BI_WEEKLY: {
          // For bi-weekly: similar, but every 14 days
          const biWeeksFromInitial = Math.ceil(delta / 14);
          currentDate = initial.clone().add(biWeeksFromInitial * 2, 'weeks');
          if (currentDate.isBefore(now)) {
            currentDate.add(2, 'weeks');
          }
          break;
        }
        case CallFrequency.MONTHLY: {
          // For monthly: use Moment's month addition (handles variable month lengths)
          let monthsFromInitial = now.diff(initial, 'months');
          if (now.date() < initial.date()) {
            monthsFromInitial--; // Adjust if now's day is before initial's day in the month
          }
          currentDate = initial.clone().add(monthsFromInitial + 1, 'months'); // +1 to ensure >= now
          if (currentDate.isBefore(now)) {
            currentDate.add(1, 'month');
          }
          break;
        }
        default:
          // Fallback to daily
          currentDate = now
            .clone()
            .add(1, 'day')
            .hour(hour)
            .minute(minute)
            .second(0)
            .millisecond(0);
      }
    }

    // Generate occurrences based on frequency (unchanged)
    while (currentDate.isBefore(endDate)) {
      // For each occurrence, generate windows for all potential attempts
      const attemptWindows = this.generateAttemptWindows(
        currentDate.toDate(),
        estimatedDurationSeconds,
        maxAttempts,
        retryIntervalMinutes,
      );

      windows.push(...attemptWindows);

      // Move to next occurrence
      currentDate = this.getNextOccurrence(currentDate, frequency);
    }

    return windows;
  }

  /**
   * Generate time windows for all potential retry attempts
   */
  private generateAttemptWindows(
    initialScheduledTime: Date,
    estimatedDurationSeconds: number,
    maxAttempts: number,
    retryIntervalMinutes: number,
  ): TimeWindow[] {
    const windows: TimeWindow[] = [];
    let attemptTime = moment(initialScheduledTime);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const start = attemptTime.toDate();
      const end = attemptTime
        .clone()
        .add(estimatedDurationSeconds, 'seconds')
        .toDate();

      windows.push({ start, end });

      // Add buffer for next retry
      if (attempt < maxAttempts - 1) {
        attemptTime = attemptTime.add(retryIntervalMinutes, 'minutes');
      }
    }

    return windows;
  }

  /**
   * Get the next occurrence based on frequency
   */
  private getNextOccurrence(
    current: moment.Moment,
    frequency: CallFrequency,
  ): moment.Moment {
    const next = current.clone();

    switch (frequency) {
      case CallFrequency.DAILY:
        return next.add(1, 'day');
      case CallFrequency.WEEKLY:
        return next.add(1, 'week');
      case CallFrequency.BI_WEEKLY:
        return next.add(2, 'weeks');
      case CallFrequency.MONTHLY:
        return next.add(1, 'month');
      default:
        return next.add(1, 'day');
    }
  }

  /**
   * Find if any windows overlap between two sets
   */
  private findOverlappingWindows(
    newWindows: TimeWindow[],
    existingWindows: TimeWindow[],
  ): { new: TimeWindow; existing: TimeWindow } | null {
    for (const newWindow of newWindows) {
      for (const existingWindow of existingWindows) {
        if (this.doWindowsOverlap(newWindow, existingWindow)) {
          return { new: newWindow, existing: existingWindow };
        }
      }
    }
    return null;
  }

  /**
   * Check if two time windows overlap
   */
  private doWindowsOverlap(window1: TimeWindow, window2: TimeWindow): boolean {
    const start1 = moment(window1.start);
    const end1 = moment(window1.end);
    const start2 = moment(window2.start);
    const end2 = moment(window2.end);

    // Windows overlap if:
    // - window1 starts before window2 ends AND
    // - window2 starts before window1 ends
    return start1.isBefore(end2) && start2.isBefore(end1);
  }

  /**
   * Get a human-readable description of when conflicts might occur
   */
  async getConflictDetails(
    patientId: string,
    frequency: CallFrequency,
    timezone: string,
    timeWindowStart: string,
    excludeScheduleId?: string,
  ): Promise<string[]> {
    const existingSchedules = await this.callScheduleRepository.find({
      where: {
        patient_id: patientId,
        status: ScheduleStatus.ACTIVE,
      },
    });

    const schedulesToCheck = excludeScheduleId
      ? existingSchedules.filter((s) => s.id !== excludeScheduleId)
      : existingSchedules;

    return schedulesToCheck.map((schedule) => {
      const scheduleTime = moment.tz(
        schedule.time_window_start,
        'HH:mm',
        schedule.timezone,
      );
      return `${schedule.frequency} call scheduled at ${scheduleTime.format('HH:mm')} ${schedule.timezone}`;
    });
  }
}
