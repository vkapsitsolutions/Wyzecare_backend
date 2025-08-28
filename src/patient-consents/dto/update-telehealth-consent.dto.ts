import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateTelehealthConsentDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  consent_given: boolean;

  @IsOptional()
  @IsDate()
  consent_date?: Date;

  @IsOptional()
  @IsString()
  patient_signature?: string;

  @IsOptional()
  @IsString()
  data_sharing_restrictions?: string;

  @IsOptional()
  @IsString()
  version?: string;
}
