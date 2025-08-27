import { IsArray, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class MedicalInfoDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  conditions?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  medications?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  allergies?: string[] = [];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  primary_physician?: string;
}
