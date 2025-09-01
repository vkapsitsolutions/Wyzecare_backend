import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ScriptCategory, ScriptStatus } from '../enums/call-scripts.enum';
import { Type } from 'class-transformer';
import { UpdateScriptQuestionDto } from './update-question.dto';

export class UpdateCallScriptDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsEnum(ScriptCategory)
  @IsOptional()
  category?: ScriptCategory;

  @IsEnum(ScriptStatus)
  @IsOptional()
  status?: ScriptStatus;

  @IsString()
  @IsOptional()
  version?: string;

  @IsInt()
  @IsOptional()
  estimated_duration?: number;

  @IsString()
  @IsOptional()
  opening_message?: string;

  @IsString()
  @IsOptional()
  closing_message?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  escalation_triggers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateScriptQuestionDto)
  @IsOptional()
  questions?: UpdateScriptQuestionDto[];
}
