import { IsOptional, IsString } from 'class-validator';

export class ListCallScriptDto {
  @IsOptional()
  @IsString()
  keyword: string;
}
