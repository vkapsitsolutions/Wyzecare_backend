import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  AuthorizedPurpose,
  HipaaAuthorizationStatus,
} from '../enums/concents.enum';

export class UpdateHipaaAuthorizationDto {
  @IsOptional()
  @IsString()
  witness_name?: string;

  @IsOptional()
  @IsString()
  witness_signature?: string;

  @IsOptional()
  @IsString()
  patient_signature?: string;

  @IsOptional()
  @IsString()
  specific_restrictions?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AuthorizedPurpose, {
    each: true,
    message: 'Invalid authorized purpose',
  })
  authorized_purposes?: AuthorizedPurpose[];

  @IsEnum(HipaaAuthorizationStatus)
  status: HipaaAuthorizationStatus;

  @IsOptional()
  @IsDate()
  signed_at?: Date;

  @IsOptional()
  @IsDate()
  expires_at?: Date;

  @IsOptional()
  @IsString()
  version?: string;
}
