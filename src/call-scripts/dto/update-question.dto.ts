import { IsOptional, IsUUID } from 'class-validator';
import { CreateScriptQuestionDto } from './create-question.dto';

export class UpdateScriptQuestionDto extends CreateScriptQuestionDto {
  @IsUUID()
  @IsOptional()
  id: string; // Required for updates to identify which question to update
}
