import { IsArray, IsUUID } from 'class-validator';

export class AssignPatientsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  patientIds: string[];
}
