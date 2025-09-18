import { IsArray, IsUUID } from 'class-validator';

export class AssignCallScriptToPatientsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  patientIds: string[];
}
