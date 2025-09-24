import { Injectable } from '@nestjs/common';
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallFrequency } from 'src/call-schedules/enums/call-schedule.enum';
import * as moment from 'moment-timezone';
import { InitiateCallPayload } from 'src/ai-calling/payloads/initiate-call.payload';
import { CallRun } from './entities/call-runs.entity';
import { CallStatus } from './enums/calls.enum';

@Injectable()
export class CallUtilsService {
  /**
   * Calculate the next scheduled time based on frequency
   */
  calculateNextScheduledTime(schedule: CallSchedule): Date | null {
    if (!schedule.timezone || !schedule.time_window_start) {
      return null;
    }

    const now = moment.tz(schedule.timezone);
    const [hour, minute] = schedule.time_window_start.split(':').map(Number);

    let next: moment.Moment;

    switch (schedule.frequency) {
      case CallFrequency.DAILY:
        next = now.clone().add(1, 'day');
        break;
      case CallFrequency.WEEKLY:
        next = now.clone().add(1, 'week');
        break;
      case CallFrequency.BI_WEEKLY:
        next = now.clone().add(2, 'weeks');
        break;
      case CallFrequency.MONTHLY:
        next = now.clone().add(1, 'month');
        break;
      default:
        return null;
    }

    next.hour(hour).minute(minute).second(0).millisecond(0);

    // Handle preferred days if specified
    if (schedule.preferred_days?.length) {
      while (!schedule.preferred_days.includes(next.day())) {
        next.add(1, 'day');
      }
    }

    return next.toDate();
  }

  /**
   * Prepare the payload for the AI calling service
   */
  prepareCallPayload(callRun: CallRun): InitiateCallPayload {
    const patient = callRun.patient;
    const script = callRun.script;
    const schedule = callRun.schedule;

    if (!patient?.contact.primary_phone) {
      throw new Error('Patient phone number is required');
    }

    if (!script) {
      throw new Error('Call script is required');
    }

    // Map gender from schedule to preferred talk
    const preferredTalk =
      (schedule?.agent_gender?.toLowerCase() as 'male' | 'female') || 'female';

    const payload: InitiateCallPayload = {
      patient_number: patient?.contact?.primary_phone,
      patient_name: patient.fullName,
      preferred_name: patient.preferredName || patient.fullName,
      title: script.title,
      category: script.category,
      prefer_to_talk: preferredTalk,
      status: script.status,
      opening_message: script.opening_message,
      closing_message: script.closing_message,
      special_instruction: schedule?.instructions,
      escalation_triggers: script.escalation_triggers || [],
      patient_medications: patient.medicalInfo?.medications || [],
      questions: script.questions || [],
    };

    return payload;
  }

  mapWebhookStatusToCallStatus(
    webhookStatus: string,
    disconnectionReason?: string,
  ): CallStatus {
    switch (webhookStatus.toLowerCase()) {
      case 'ended':
        // Check disconnection reason to determine if it was successful or failed
        if (disconnectionReason) {
          const reason = disconnectionReason.toLowerCase();
          if (
            reason.includes('dial_busy') ||
            reason.includes('dial_failed') ||
            reason.includes('dial_no_answer') ||
            reason.includes('dial_failed') ||
            reason.includes('voicemail_reached') ||
            reason.includes('inactivity') ||
            reason.includes('user_declined')
          ) {
            return CallStatus.NOT_CONNECTED;
          }
        }
        return CallStatus.ENDED;

      case 'ongoing':
        return CallStatus.ONGOING;

      case 'not_connected':
        return CallStatus.NOT_CONNECTED;

      case 'error':
        return CallStatus.ERROR;

      default:
        return CallStatus.ENDED;
    }
  }
}
