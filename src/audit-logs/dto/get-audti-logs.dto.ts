import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { AuditAction } from '../entities/audit-logs.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class GetAuditLogsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  actor_id?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
