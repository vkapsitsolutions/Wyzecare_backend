import { IsInt, IsPositive, Max } from 'class-validator';

export class ReduceLicensesDto {
  @IsPositive()
  @Max(999)
  @IsInt()
  licensesToReduce: number;
}
