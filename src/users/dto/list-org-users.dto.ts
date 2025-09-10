import { IsEnum, IsOptional, IsString } from 'class-validator';
import { USER_STATUS } from '../enums/user-status.enum';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';

export class ListOrgUsersDto {
  @IsEnum(USER_STATUS)
  @IsOptional()
  status: USER_STATUS;

  @IsOptional()
  @IsEnum(RoleName)
  role: RoleName;

  @IsOptional()
  @IsString()
  keyword: string;
}
