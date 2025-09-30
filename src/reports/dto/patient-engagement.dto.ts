import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

enum SortBy {
  PATIENT_NAME = 'patientName',
  CALLS = 'calls',
  ENGAGEMENT = 'engagement',
  AVG_WELLNESS = 'avgWellness',
  ALERT = 'alert',
  STATUS = 'status',
  LAST_CALL = 'lastCall',
}

enum SortDir {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PatientEngagementDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy = SortBy.PATIENT_NAME;

  @IsEnum(SortDir)
  @IsOptional()
  sortDir?: SortDir = SortDir.ASC;
}
