import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class RepricingLogsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  organizationId: string;
}
