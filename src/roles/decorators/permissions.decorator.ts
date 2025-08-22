import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/roles-permissions.enum';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Decorator to specify required organization permissions for a route or handler.
 *
 * @param permissions - One or more {@link PermissionsEnum} values required to access the resource.
 * @returns A custom decorator that sets the required permissions metadata using {@link PERMISSIONS_KEY}.
 *
 * @example
 * ```ts
 * @RequirePermissions(Permission.READ, Permission.WRITE)
 * someHandler() { ... }
 * ```
 */
export const RequirePermissions = (
  ...permissions: Permission[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
