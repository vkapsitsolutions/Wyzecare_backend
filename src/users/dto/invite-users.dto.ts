import {
  IsArray,
  IsEmail,
  IsEnum,
  ValidateNested,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(RoleName)
  roleName: RoleName;
}

export class InviteUsersDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'invites must contain at least one item' })
  @ArrayUnique((o: InviteUserDto) => o.email, {
    message: 'duplicate emails are not allowed',
  })
  @ValidateNested({ each: true })
  @Type(() => InviteUserDto)
  invites: InviteUserDto[];
}
