import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from '../enums/call-scripts.enum';
import { Type } from 'class-transformer';
import { ScaleLabels } from '../entities/script-questions.entity';

class ResponseOptionDto {
  @IsString()
  id: string; // e.g., 'a', 'b'

  @IsString()
  label: string;

  @IsOptional()
  value?: string | number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateScriptQuestionDto {
  @IsInt()
  question_order: number;

  @IsString()
  question_text: string;

  @IsEnum(QuestionType)
  question_type: QuestionType;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean = false;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponseOptionDto)
  @IsOptional()
  response_options?: ResponseOptionDto[];

  @IsInt()
  @IsOptional()
  scale_min?: number;

  @IsInt()
  @IsOptional()
  scale_max?: number;

  @IsObject()
  @IsOptional()
  scale_labels?: ScaleLabels;

  @IsString()
  @IsOptional()
  yes_response?: string;

  @IsString()
  @IsOptional()
  no_response?: string;
}
