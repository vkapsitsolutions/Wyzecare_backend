import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { RelationshipEnum } from '../entities/patient-emergency-contact.entity';

export class PatientContactDto {
  @IsString()
  @IsPhoneNumber()
  primary_phone: string;

  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  alternate_phone?: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  @IsString()
  street_address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip_code?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts: EmergencyContactDto[];
}

class EmergencyContactDto {
  @IsUUID()
  @IsOptional()
  id?: string; // in case we need to update an existing contact

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(RelationshipEnum)
  relationship?: RelationshipEnum;

  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  phone!: string;

  @IsOptional()
  @IsString()
  alternate_phone?: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  is_primary?: boolean;
}
