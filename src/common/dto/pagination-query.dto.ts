import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsPositive()
  @IsInt()
  page: number = 1;

  @IsOptional()
  @IsPositive()
  @IsInt()
  limit: number = 20;
}
