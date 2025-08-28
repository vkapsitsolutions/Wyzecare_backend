import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { CommunicationMethodEnum } from '../enums/concents.enum';
import { RelationshipEnum } from 'src/patients/entities/patient-emergency-contact.entity';

export class UpdateCommunicationPreferencesDto {
  @IsArray()
  @IsEnum(CommunicationMethodEnum, { each: true })
  allowed_methods: CommunicationMethodEnum[];

  @IsOptional()
  @IsEnum(RelationshipEnum)
  preferred_relationship?: RelationshipEnum;

  @IsOptional()
  @IsString()
  communication_restrictions?: string;

  @IsOptional()
  @IsString()
  version?: string;
}
