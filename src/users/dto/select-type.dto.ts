import { IsEnum } from 'class-validator';
import { USER_TYPE } from '../enums/user-type.enum';

export class SelectUserTypeDto {
  @IsEnum(USER_TYPE)
  userType: USER_TYPE;
}
