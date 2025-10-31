import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  Matches,
  IsPositive,
  Max,
  IsDateString,
} from 'class-validator';
import {
  AgentGender,
  CallFrequency,
  ScheduleStatus,
} from '../enums/call-schedule.enum';
import { TimezoneEnum } from 'src/organizations/enums/organization.enum';

export class CreateCallScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id: string;

  @IsUUID()
  @IsNotEmpty()
  script_id: string;

  @IsEnum(CallFrequency)
  frequency: CallFrequency;

  @IsEnum(AgentGender)
  agent_gender: AgentGender;

  @IsInt()
  @IsNotEmpty()
  @Max(5)
  @IsPositive()
  max_attempts: number;

  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(10)
  @IsOptional()
  retry_interval_minutes: number;

  @IsEnum(TimezoneEnum)
  timezone: TimezoneEnum;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'time_window_start must be in HH:mm format',
  })
  time_window_start: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'time_window_end must be in HH:mm format',
  })
  time_window_end: string;

  // may be used later
  // @IsOptional()
  // @IsArray()
  // @IsNumber({}, { each: true })
  // preferred_days?: number[]; // [0..6] for days of week

  @IsOptional()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsEnum(ScheduleStatus)
  status: ScheduleStatus;

  @IsNumber()
  @IsNotEmpty()
  estimated_duration_seconds: number;
}
