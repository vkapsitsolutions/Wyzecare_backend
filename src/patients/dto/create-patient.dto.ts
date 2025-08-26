import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  patientId: string;

  @IsString()
  @IsNotEmpty()
  preferredName: string;

  @IsEnum(GENDER)
  gender: GENDER;

  @IsDate()
  @Transform(
    ({ value }: { value: string | number | Date }): { value: Date } => ({
      value: new Date(value),
    }),
  )
  dateOfBirth: Date;

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
}
