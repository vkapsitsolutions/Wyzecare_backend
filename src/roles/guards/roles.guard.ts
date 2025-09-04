import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../enums/roles-permissions.enum'; // Adjust the import path based on your project structure
import { Request } from 'express';
import { User } from 'src/users/entities/user.entity';

// role specific guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (public route)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as User;

    // If no user or no role, deny access
    if (!user || !user.role || !user.role.slug) {
      return false;
    }

    // Check if user's role matches any required role
    return requiredRoles.some((role) => user.role && user.role.slug === role);
  }
}
