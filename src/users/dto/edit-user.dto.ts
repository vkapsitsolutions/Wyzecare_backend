import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { USER_STATUS } from '../enums/user-status.enum';

export class EditUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  firstName: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  lastName: string;

  @IsOptional()
  @IsEnum(RoleName)
  roleName: RoleName;

  @IsOptional()
  @IsEnum(USER_STATUS)
  status: USER_STATUS;
}
