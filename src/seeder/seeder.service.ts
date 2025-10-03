import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { arraysEqualIgnoreOrder } from 'src/common/helpers/seeder-helper';
import { Role } from 'src/roles/entities/role.entity';
import { Permission, RoleName } from 'src/roles/enums/roles-permissions.enum';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import {
  PlanTypeEnum,
  SubscriptionPlan,
} from 'src/subscriptions/entities/subscription-plans.entity';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,

    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // skip seeding in test environment
    if (process.env.NODE_ENV === 'test') return;
    try {
      await this.seedRolesIfNotExists();
      await this.seedSubscriptionPlansIfNotExists();
      await this.seedSuperAdminIfNotExists();
    } catch (err) {
      this.logger.error(`Error while seeding: ${err}`);
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
          Permission.VIEW_ALL_PATIENTS,
          Permission.EDIT_PATIENTS,
          Permission.MANAGE_USERS,
          Permission.VIEW_REPORTS,
          Permission.MANAGE_ALERTS,
          Permission.SYSTEM_SETTINGS,
        ],
        description: 'Manage users, roles and system level settings.',
        is_active: true,
      },
      {
        title: 'Care Coordinator',
        slug: RoleName.CARE_COORDINATOR,
        permissions: [
          Permission.EDIT_PATIENTS,
          Permission.VIEW_REPORTS,
          Permission.MANAGE_ALERTS,
        ],
        description: 'Day-to-day patient coordination and care.',
        is_active: true,
      },
      {
        title: 'Viewer',
        slug: RoleName.VIEWER,
        permissions: [Permission.VIEW_REPORTS],
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

  private async seedSubscriptionPlansIfNotExists() {
    const seeds: Partial<SubscriptionPlan>[] = [
      {
        name: 'Care Plus Plan',
        slug: 'care-plus',
        plan_type: PlanTypeEnum.CARE_PLUS,
        price_monthly: 49.99,
        price_yearly: null,
        max_patients: null,
        max_users: 5,
        max_admins: 1,
        max_calls_per_day: null,
        max_check_ins_per_day: 3,
        max_call_length_minutes: 10,
        script_builder_access: true,
        ad_supported_discounts: true,
        recording_history_days: 30,
        features: [
          'Check-ins per day 3',
          'Max call length 10 minutes',
          'Script builder with ready-made scripts',
          '1 admin + 5 users allowed',
          'Recording history 30 days',
          // 'Ad-supported discounts in the future',
        ],
        is_active: true,
      },
    ];

    for (const seed of seeds) {
      const exists = await this.subscriptionPlanRepo.findOne({
        where: { slug: seed.slug },
      });
      if (!exists) {
        const plan = this.subscriptionPlanRepo.create({
          name: seed.name,
          slug: seed.slug,
          plan_type: seed.plan_type,
          price_monthly: seed.price_monthly,
          price_yearly: seed.price_yearly ?? null,
          max_patients: seed.max_patients ?? null,
          max_users: seed.max_users ?? null,
          max_admins: seed.max_admins ?? null,
          max_calls_per_day: seed.max_calls_per_day ?? null,
          max_check_ins_per_day: seed.max_check_ins_per_day ?? null,
          max_call_length_minutes: seed.max_call_length_minutes ?? null,
          script_builder_access: seed.script_builder_access ?? false,
          ad_supported_discounts: seed.ad_supported_discounts ?? false,
          recording_history_days: seed.recording_history_days ?? null,
          features: seed.features ?? null,
          is_active: seed.is_active ?? true,
        });
        await this.subscriptionPlanRepo.save(plan);
        this.logger.log(`Seeded subscription plan: ${seed.slug}`);
      } else {
        this.logger.debug(
          `Subscription plan already exists, skipping seed: ${seed.slug}`,
        );
        // update fields if necessary
        const needUpdate =
          exists.name !== seed.name ||
          exists.plan_type !== seed.plan_type ||
          exists.price_monthly !== seed.price_monthly ||
          exists.price_yearly !== seed.price_yearly ||
          exists.max_patients !== seed.max_patients ||
          exists.max_users !== seed.max_users ||
          exists.max_admins !== seed.max_admins ||
          exists.max_calls_per_day !== seed.max_calls_per_day ||
          exists.max_check_ins_per_day !== seed.max_check_ins_per_day ||
          exists.max_call_length_minutes !== seed.max_call_length_minutes ||
          exists.script_builder_access !== seed.script_builder_access ||
          exists.recording_history_days !== seed.recording_history_days ||
          exists.ad_supported_discounts !== seed.ad_supported_discounts ||
          !arraysEqualIgnoreOrder(exists.features ?? [], seed.features ?? []) ||
          exists.is_active !== seed.is_active;
        if (needUpdate) {
          exists.name = seed.name ?? exists.name;
          exists.plan_type = seed.plan_type ?? exists.plan_type;
          exists.price_monthly = seed.price_monthly ?? exists.price_monthly;
          exists.price_yearly = seed.price_yearly ?? exists.price_yearly;
          exists.max_patients = seed.max_patients ?? exists.max_patients;
          exists.max_users = seed.max_users ?? exists.max_users;
          exists.max_admins = seed.max_admins ?? exists.max_admins;
          exists.max_calls_per_day =
            seed.max_calls_per_day ?? exists.max_calls_per_day;
          exists.max_check_ins_per_day =
            seed.max_check_ins_per_day ?? exists.max_check_ins_per_day;
          exists.max_call_length_minutes =
            seed.max_call_length_minutes ?? exists.max_call_length_minutes;
          exists.script_builder_access =
            seed.script_builder_access ?? exists.script_builder_access;
          exists.recording_history_days =
            seed.recording_history_days ?? exists.recording_history_days;
          exists.ad_supported_discounts =
            seed.ad_supported_discounts ?? exists.ad_supported_discounts;
          exists.features = seed.features ?? exists.features;
          exists.is_active = seed.is_active ?? exists.is_active;
          await this.subscriptionPlanRepo.save(exists);
          this.logger.log(`Updated subscription plan seed: ${seed.slug}`);
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
