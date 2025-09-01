import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScriptCategory, ScriptStatus } from '../enums/call-scripts.enum';
import { CreateScriptQuestionDto } from './create-question.dto';

export class CreateCallScriptDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ScriptCategory)
  category: ScriptCategory;

  @IsEnum(ScriptStatus)
  @IsOptional()
  status?: ScriptStatus = ScriptStatus.ACTIVE;

  @IsString()
  @IsOptional()
  version?: string = 'v1.0';

  @IsInt()
  @IsOptional()
  estimated_duration?: number;

  @IsString()
  opening_message: string;

  @IsString()
  closing_message: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  escalation_triggers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScriptQuestionDto)
  @IsOptional()
  questions?: CreateScriptQuestionDto[];
}
