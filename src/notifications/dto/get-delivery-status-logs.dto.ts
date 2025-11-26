// src/delivery-status-logs/dto/get-delivery-status-logs.dto.ts
import { IsOptional, IsUUID, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class GetDeliveryStatusLogsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
