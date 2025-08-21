// src/roles/roles.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission, RoleName } from './enums/roles-permissions.enum';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  getSystemPermissions() {
    return {
      success: true,
      permissions: Object.values(Permission),
    };
  }

  async findAll() {
    const roles = await this.roleRepo.find({
      where: { slug: Not(RoleName.SUPER_ADMIN) },
    });
    return {
      success: true,
      message: 'Roles retrieved successfully',
      data: roles,
    };
  }

  async findOne(id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      return {
        success: false,
        message: 'Role not found',
      };
    }
    return {
      success: true,
      message: 'Role retrieved successfully',
      data: role,
    };
  }

  async findAdministratorRole() {
    const administratorRole = await this.roleRepo.findOne({
      where: { slug: RoleName.ADMINISTRATOR },
    });

    if (!administratorRole) {
      this.logger.error('Administrator role not found');
      throw new NotFoundException(`Administrator role not found`);
    }

    return {
      success: true,
      message: 'Administrator role retrieved successfully',
      data: administratorRole,
    };
  }
}
