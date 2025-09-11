import { PartialType } from '@nestjs/mapped-types';
import { CreateCallScheduleDto } from './create-schedule.dto';

export class UpdateCallScheduleDto extends PartialType(CreateCallScheduleDto) {}
