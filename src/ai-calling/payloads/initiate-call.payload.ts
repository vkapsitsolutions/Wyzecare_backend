import { ScriptQuestion } from 'src/call-scripts/entities/script-questions.entity';
import { ScriptStatus } from 'src/call-scripts/enums/call-scripts.enum';

/** Single question in the reminder flow */

/** Allowed preferences for caller voice/gender (extend if you have more options) */
export type PreferredTalk = 'female' | 'male';

/** Root payload for creating/updating a reminder/notification flow */
export interface InitiateCallPayload {
  patient_number: string; // e.g. "+9123456789"
  patient_name: string;
  preferred_name: string;
  title: string;
  category?: string; // optional, e.g. "Medication Reminder"
  prefer_to_talk?: PreferredTalk;
  status?: ScriptStatus;
  opening_message?: string;
  closing_message?: string;
  escalation_triggers?: string[];
  questions: ScriptQuestion[];
}
