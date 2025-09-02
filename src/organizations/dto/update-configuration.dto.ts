import { IsEnum, IsOptional } from 'class-validator';
import {
  DateFormatEnum,
  LanguageEnum,
  TimezoneEnum,
} from '../enums/organization.enum';

export class UpdateConfigurationDto {
  @IsOptional()
  @IsEnum(TimezoneEnum)
  timezone?: TimezoneEnum;

  @IsOptional()
  @IsEnum(DateFormatEnum)
  date_format?: DateFormatEnum;

  @IsOptional()
  @IsEnum(LanguageEnum)
  language?: LanguageEnum;
}
