import { SetMetadata } from '@nestjs/common';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';

export const ROLES_KEY = 'roles';
export const RequiredRoles = (...roles: RoleName[]) =>
  SetMetadata(ROLES_KEY, roles);
