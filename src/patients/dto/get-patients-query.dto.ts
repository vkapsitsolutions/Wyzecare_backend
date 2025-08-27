import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagnination-query.dto';
import { PatientStatusEnum } from '../entities/patient.entity';

export class GetPatientsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PatientStatusEnum)
  status: PatientStatusEnum;
}
