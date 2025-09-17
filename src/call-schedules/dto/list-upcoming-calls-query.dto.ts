import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagnination-query.dto';

export class ListUpcomingCallsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}
