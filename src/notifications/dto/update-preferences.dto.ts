import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsString,
} from 'class-validator';
import { AlertSeverity } from 'src/alerts/entities/alert.entity';

export class UpdatePreferencesDto {
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sms_enabled: boolean;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  @IsEnum(AlertSeverity, { each: true })
  enabled_severity_levels: AlertSeverity[];
}
