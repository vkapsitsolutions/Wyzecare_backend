import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  AuthorizedRecipientEnum,
  DataRetentionPeriodEnum,
} from '../enums/concents.enum';
import { Transform } from 'class-transformer';

export class UpdatePrivacyPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(AuthorizedRecipientEnum, {
    each: true,
    message: 'Invalid value for authorized_recipients',
  })
  authorized_recipients?: AuthorizedRecipientEnum[];

  @IsOptional()
  @IsString()
  data_sharing_restrictions?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allow_call_recording: boolean;

  @IsOptional()
  @IsString()
  recording_restrictions?: string;

  @IsEnum(DataRetentionPeriodEnum)
  data_retention_period: DataRetentionPeriodEnum;

  @IsOptional()
  @IsString()
  version?: string;
}
