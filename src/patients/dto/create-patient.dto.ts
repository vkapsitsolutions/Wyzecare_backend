import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { GENDER } from 'src/common/types/gender.enum';
import { WellnessStatusEnum } from '../entities/patient.entity';

export class CreatePatientDto {
  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @IsOptional()
  patientId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  preferredName: string;

  @IsEnum(GENDER)
  gender: GENDER;

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsNotEmpty()
  roomNumber?: string;

  @IsOptional()
  @IsNotEmpty()
  floor?: string;

  @IsOptional()
  @IsEnum(WellnessStatusEnum)
  current_wellness?: WellnessStatusEnum;

  @IsOptional()
  @IsNotEmpty()
  notes?: string;

  @IsOptional()
  @IsNotEmpty()
  careTeam?: string;

  @IsUUID()
  @IsOptional()
  id: string; // only in case of update
}
