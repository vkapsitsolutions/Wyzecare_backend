import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagnination-query.dto';
import { CallStatus } from '../enums/calls.enum';

export class GetCallsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}
