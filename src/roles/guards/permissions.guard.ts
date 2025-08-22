import { CanActivate, ExecutionContext, Inject, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../roles.service';
import { Request } from 'express';
import { User } from 'src/users/entities/user.entity';
import { Permission } from '../enums/roles-permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role } from '../entities/role.entity';

export class PermissionsGuard implements CanActivate {
  private logger = new Logger(PermissionsGuard.name);
  constructor(
    private readonly reflector: Reflector,
    @Inject(RolesService)
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.logger.debug(
      `Required permissions for handler: ${JSON.stringify(requiredPermissions)}`,
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.debug(
        'No permissions metadata found on route — allowing access.',
      );
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;

    if (!user) {
      this.logger.warn('Request has no user attached — denying access.');
      return false;
    }

    if (!user.role || !user.role.id) {
      this.logger.warn(
        `User ${user?.id ?? 'unknown'} has no role or role id — denying access.`,
      );
      return false;
    }

    let role: Role | undefined;
    try {
      role = (await this.rolesService.findOne(user.role.id)).data;
    } catch (err) {
      this.logger.error(
        `Error fetching role for user ${user?.id ?? 'unknown'} (roleId=${user.role.id}):`,
        (err as Error).message ?? err,
      );
      return false;
    }

    if (!role) {
      this.logger.warn(
        `Role not found for roleId=${user.role.id} — denying access.`,
      );
      return false;
    }

    if (!Array.isArray(role.permissions)) {
      this.logger.warn(
        `Role data or permissions missing/invalid for roleId=${user.role.id} — denying access.`,
      );
      return false;
    }

    const hasAll = requiredPermissions.every((permission) =>
      role.permissions.includes(permission),
    );

    if (!hasAll) {
      this.logger.verbose(
        `User ${user?.id ?? 'unknown'} does not have required permissions: ${JSON.stringify(requiredPermissions)}. User role permissions: ${JSON.stringify(
          role.permissions,
        )}`,
      );
    } else {
      this.logger.debug(
        `User ${user?.id ?? 'unknown'} authorized for required permissions.`,
      );
    }

    return hasAll;
  }
}
