import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { arraysEqualIgnoreOrder } from 'src/common/helpers/seeder-helper';
import { Role } from 'src/roles/entities/role.entity';
import { Permission, RoleName } from 'src/roles/enums/roles-permissions.enum';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // skip seeding in test environment
    if (process.env.NODE_ENV === 'test') return;
    try {
      await this.seedRolesIfNotExists();
      await this.seedSuperAdminIfNotExists();
    } catch (err) {
      this.logger.error('Error while seeding roles', err);
    }
  }

  private async seedRolesIfNotExists() {
    const seeds: Partial<Role & { slug: RoleName }>[] = [
      {
        title: 'Super Admin',
        slug: RoleName.SUPER_ADMIN,
        permissions: Object.values(Permission),
        description: 'Full access to the system.',
        is_active: true,
      },
      {
        title: 'Administrator',
        slug: RoleName.ADMINISTRATOR,
        permissions: [
          Permission.MANAGE_USERS,
          Permission.INVITE_USERS,
          Permission.MANAGE_ROLES,
          Permission.VIEW_REPORTS,
          Permission.MANAGE_ALERTS,
          Permission.SYSTEM_SETTINGS,
          Permission.MANAGE_CONSENT,
          Permission.EXPORT_DATA,
        ],
        description: 'Manage users, roles and system level settings.',
        is_active: true,
      },
      {
        title: 'Care Coordinator',
        slug: RoleName.CARE_COORDINATOR,
        permissions: [
          Permission.VIEW_ASSIGNED_PATIENTS,
          Permission.EDIT_PATIENTS,
          Permission.MANAGE_PATIENT_ACCESS,
          Permission.VIEW_REPORTS,
          Permission.MANAGE_ALERTS,
        ],
        description: 'Day-to-day patient coordination and care.',
        is_active: true,
      },
      {
        title: 'Viewer',
        slug: RoleName.VIEWER,
        permissions: [
          Permission.VIEW_ASSIGNED_PATIENTS,
          Permission.VIEW_REPORTS,
        ],
        description: 'Read-only access to assigned patients and reports.',
        is_active: true,
      },
    ];

    for (const seed of seeds) {
      const exists = await this.roleRepo.findOne({
        where: { slug: seed.slug },
      });
      if (!exists) {
        const role = this.roleRepo.create({
          title: seed.title,
          slug: seed.slug,
          permissions: seed.permissions ?? [],
          description: seed.description,
          is_active: seed.is_active ?? true,
        });
        await this.roleRepo.save(role);
        this.logger.log(`Seeded role: ${seed.slug}`);
      } else {
        this.logger.debug(`Role already exists, skipping seed: ${seed.slug}`);
        // update permissions/description automatically
        const needUpdate =
          !arraysEqualIgnoreOrder(exists.permissions, seed.permissions) ||
          exists.description !== seed.description ||
          exists.is_active !== seed.is_active;
        if (needUpdate) {
          exists.permissions = seed.permissions ?? exists.permissions;
          exists.description = seed.description ?? exists.description;
          exists.is_active = seed.is_active ?? exists.is_active;
          await this.roleRepo.save(exists);
          this.logger.log(`Updated role seed: ${seed.slug}`);
        }
      }
    }
  }

  async seedSuperAdminIfNotExists() {
    const superAdminMail =
      this.configService.getOrThrow<string>('SUPER_ADMIN_EMAIL');
    const superAdminPassword = this.configService.getOrThrow<string>(
      'SUPER_ADMIN_PASSWORD',
    );

    const existingSuperAdmin = await this.userRepo.findOne({
      where: { email: superAdminMail },
    });

    if (existingSuperAdmin) {
      return this.logger.log('Super admin already exists, skipping creation');
    }

    const superAdminRole = await this.roleRepo.findOne({
      where: { slug: RoleName.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      return this.logger.warn(
        'not added super admin, role not found, skipping creation',
      );
    }

    const hashedPassword = await argon2.hash(superAdminPassword);

    const superAdmin = this.userRepo.create({
      first_name: 'Super',
      last_name: 'Admin',
      email: superAdminMail,
      password: hashedPassword,
      email_verified: true,
      role: superAdminRole,
    });

    await this.userRepo.save(superAdmin);
  }
}
