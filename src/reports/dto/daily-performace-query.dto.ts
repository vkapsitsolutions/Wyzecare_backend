import { IsInt, IsNumber, IsPositive, Max } from 'class-validator';

export class GetDailyPerformanceBreakDown {
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(30)
  period: number;
}
