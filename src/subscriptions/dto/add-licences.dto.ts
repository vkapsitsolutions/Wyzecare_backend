import { IsInt, IsPositive, Max } from 'class-validator';

export class AddLicensesDto {
  @IsPositive()
  @Max(1000)
  @IsInt()
  additionalLicenses: number;
}
