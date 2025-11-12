import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserUtilsService } from './users-utils.service';
import { VerificationsService } from 'src/verifications/verifications.service';
import {
  Verification,
  VerificationStatus,
  VerificationType,
} from 'src/verifications/entities/verification.entity';
import * as argon2 from 'argon2';
import { LOGIN_PROVIDER } from './enums/login.provider.enum';
import { JwtTokenService } from 'src/auth/jwt-token.service';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { UploadsService } from 'src/uploads/uploads.service';
import { randomUUID } from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-user.dto';
import { ListOrgUsersDto } from './dto/list-org-users.dto';
import { USER_STATUS } from './enums/user-status.enum';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { EditUserDto } from './dto/edit-user.dto';
import { RolesService } from 'src/roles/roles.service';
import axios from 'axios';
import { Readable } from 'stream';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { AuditAction } from 'src/audit-logs/entities/audit-logs.entity';
import { Request } from 'express';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { USER_TYPE } from './enums/user-type.enum';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly userUtilsService: UserUtilsService,

    private readonly verificationsService: VerificationsService,

    private readonly jwtTokenService: JwtTokenService,

    private readonly uploadsService: UploadsService,

    private readonly subscriptionsService: SubscriptionsService,

    private readonly rolesService: RolesService,

    private readonly auditLogsService: AuditLogsService,

    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;
    const normalizedEmail = email.toLowerCase().trim();

    const userExists =
      await this.userUtilsService.checkEmailExists(normalizedEmail);
    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const verification = await this.verificationsService.findLatestByEmail(
      normalizedEmail,
      VerificationType.EMAIL_OTP,
    );

    if (!verification || verification.status !== VerificationStatus.APPROVED) {
      throw new BadRequestException('Email not verified');
    }

    const passwordHash = await argon2.hash(password);

    try {
      const savedUser = await this.userRepository.manager.transaction(
        async (manager) => {
          const userRepo = manager.getRepository(User);
          const verificationRepo = manager.getRepository(Verification);

          const newUser = userRepo.create({
            first_name: firstName,
            last_name: lastName,
            email: normalizedEmail,
            password: passwordHash,
            email_verified: true,
            login_provider: LOGIN_PROVIDER.LOCAL,
          });

          const { data: adminRole } =
            await this.rolesService.findAdministratorRole();

          newUser.role = adminRole;

          const user = await userRepo.save(newUser);

          await verificationRepo.delete({ id: verification.id });

          return user;
        },
      );

      const { accessToken, refreshToken } =
        this.jwtTokenService.generateTokens(savedUser);

      await this.userUtilsService.setCurrentRefreshToken(
        savedUser.id,
        refreshToken,
      );

      return {
        success: true,
        message: 'User registered successfully',
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('User already exists');
      }

      throw err;
    }
  }

  async selectUserType(user: User, userType: USER_TYPE) {
    if (user.user_type) {
      throw new BadRequestException('User type already selected');
    }

    user.user_type = userType;

    const organization = await this.organizationsService.createOrganization(
      user,
      userType,
    );

    user.organization_id = organization.id;

    if (user.role?.slug === RoleName.ADMINISTRATOR) {
      const otherUsers = await this.userRepository.find({
        where: {
          organization_id: user.organization_id,
          id: Not(user.id),
        },
      });

      for (const otherUser of otherUsers) {
        otherUser.user_type = userType;
        await this.userRepository.save(otherUser);
      }
    }

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'User type selected successfully',
    };
  }

  async findOrCreateSocialUser(createSocialDto: {
    email: string;
    firstName: string;
    lastName: string;
    photo?: string;
  }) {
    const { email, firstName, lastName, photo } = createSocialDto;
    const normalizedEmail = email.toLowerCase().trim();

    const userExists = await this.userRepository.findOne({
      where: { email },
      relations: { role: true },
      withDeleted: true,
    });
    if (userExists) {
      // if exists, return the existing user to be able to login

      userExists.last_login = new Date();

      await this.userRepository.save(userExists);

      return userExists;
    }
    let photoKey: string | null = null;

    if (photo) {
      photoKey = await this.handlePhotoUpload(photo);
    }

    // No verification needed for Google – assume verified
    try {
      const savedUser = await this.userRepository.manager.transaction(
        async (manager) => {
          const userRepo = manager.getRepository(User);

          const newUser = userRepo.create({
            first_name: firstName,
            last_name: lastName,
            email: normalizedEmail,
            email_verified: true,
            login_provider: LOGIN_PROVIDER.GOOGLE,
            photo: photoKey ?? undefined,
            last_login: new Date(),
          });

          const { data: adminRole } =
            await this.rolesService.findAdministratorRole();

          newUser.role = adminRole;

          return await userRepo.save(newUser);
        },
      );

      return savedUser;
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('User already exists');
      }
      throw err;
    }
  }

  async getProfile(user: User) {
    if (user.photo) {
      const photo = await this.uploadsService.getFile(user.photo);

      if (photo) user.photo = photo;
    }

    return {
      success: true,
      message: 'User retrieved success',
      user,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, token, password } = resetPasswordDto;
    const normalizedEmail = email.toLowerCase().trim();

    const user =
      await this.userUtilsService.findByEmailForInternal(normalizedEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate token
    const verification = await this.verificationsService.validateResetToken(
      normalizedEmail,
      token,
    );

    const passwordHash = await argon2.hash(password);

    try {
      user.password = passwordHash;
      await this.userRepository.save(user);

      await this.verificationsService.deleteVerification(verification.id);

      //  Invalidate any existing sessions (clear refresh_token_hash)
      await this.userUtilsService.clearCurrentRefreshToken(user);

      return { success: true, message: 'Password reset successfully' };
    } catch (err) {
      this.logger.error(`resetPassword error: ${err}`);
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  async updateUser(
    user: User,
    updateUserDto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const { firstName, lastName, gender } = updateUserDto;

    if (firstName) user.first_name = firstName;
    if (lastName) user.last_name = lastName;
    if (gender) user.gender = gender;

    if (file) {
      if (user.photo) await this.uploadsService.deleteFile(user.photo);

      const key = `users/profile-pic-${randomUUID()}`;
      const uploadResult = await this.uploadsService.uploadFile(file, key);

      if (uploadResult) {
        user.photo = key;
      }
    }

    const savedUser = await this.userRepository.save(user);
    return {
      success: true,
      message: 'User updated successfully',
      user: savedUser,
    };
  }

  async changePassword(user: User, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const loggedInUser = await this.userUtilsService.findByEmailForInternal(
      user.email,
    );

    if (!loggedInUser) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await argon2.verify(
      loggedInUser?.password,
      currentPassword,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid current password');
    }

    const newPasswordHash = await argon2.hash(newPassword);

    user.password = newPasswordHash;

    const savedUser = await this.userRepository.save(user);

    return {
      success: true,
      message: 'Password changed success',
      user: savedUser,
    };
  }

  async listOrganizationUsers(organizationId: string, query: ListOrgUsersDto) {
    const { role, status, keyword } = query;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.organization_id = :orgId', { orgId: organizationId });

    if (role) {
      qb.andWhere('role.slug = :role', { role });
    }

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    if (keyword && keyword.trim() !== '') {
      const kw = `%${keyword.trim()}%`;
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('user.first_name ILIKE :kw', { kw })
            .orWhere('user.last_name ILIKE :kw', { kw })
            .orWhere('user.email ILIKE :kw', { kw });
        }),
      );
    }

    const users = await qb.orderBy('user.created_at', 'DESC').getMany();

    for (const user of users) {
      if (user.photo) {
        user.photo = (await this.uploadsService.getFile(user.photo)) || '';
      }
    }

    return {
      success: true,
      message: 'User fetched',
      data: users,
    };
  }

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
      relations: {
        role: true,
        organization: true,
        created_by: true,
        updated_by: true,
        deleted_by: true,
      },

      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User this id ${id} not found in the system`);
    }

    if (user.photo) {
      user.photo = (await this.uploadsService.getFile(user.photo)) || '';
    }

    return {
      success: true,
      message: 'User fetched',
      data: user,
    };
  }

  async toggleUserStatus(
    userId: string,
    organizationId: string,
    loggedInUser: User,
    req: Request,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true, organization: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const beforeStatus = user.status;

    if (!user.organization || user.organization.id !== organizationId) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    if (user.role?.slug === RoleName.ADMINISTRATOR) {
      throw new BadRequestException('Cannot change status of an administrator');
    }

    const subscriptionResp =
      await this.subscriptionsService.getSubscriptionStatus(organizationId);
    const maxActiveUsers = subscriptionResp?.data?.subscription_plan?.max_users;

    if (
      typeof maxActiveUsers === 'number' &&
      user.status === USER_STATUS.INACTIVE
    ) {
      const currentActiveUsers = await this.userRepository.count({
        where: {
          organization: { id: organizationId },
          role: { slug: Not(RoleName.ADMINISTRATOR) },
          status: USER_STATUS.ACTIVE,
        },
      });

      if (currentActiveUsers >= maxActiveUsers) {
        // max users check is removed temporarily
        // throw new BadRequestException(
        //   `You cannot have more than ${maxActiveUsers} active users as per current subscription`,
        // );
      }
    }

    user.status =
      user.status === USER_STATUS.ACTIVE
        ? USER_STATUS.INACTIVE
        : USER_STATUS.ACTIVE;

    user.updated_by = loggedInUser;
    const savedUser = await this.userRepository.save(user);

    if (savedUser.status === USER_STATUS.INACTIVE) {
      await this.auditLogsService.createLog({
        organization_id: loggedInUser.organization_id,
        actor_id: loggedInUser.id,
        role: loggedInUser.role?.slug,
        action: AuditAction.USER_DEACTIVATED,
        module_id: userId,
        module_name: 'User',
        message: `User with name ${user.fullName} deactivated. User id ${user.id}`,
        payload: {
          before: { beforeStatus },
          after: { afterStatus: user.status },
        },
        ip_address: req.ip,
        device_info: req.headers['user-agent'],
      });
    }

    return {
      success: true,
      message: 'User status updated',
      data: savedUser,
    };
  }

  async editUser(
    editUserDto: EditUserDto,
    userId: string,
    organizationId: string,
    loggedInUser: User,
    req: Request,
  ) {
    const { firstName, lastName, roleName, status } = editUserDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true, organization: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const oldRole = user.role?.slug;

    if (!user.organization || user.organization.id !== organizationId) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    let newRole = user.role;
    if (roleName) {
      const { data: role } = await this.rolesService.findRoleBySlug(roleName);
      newRole = role;
      if (!newRole) {
        throw new NotFoundException(`Role ${roleName} not found`);
      }
    }

    const subscriptionResp =
      await this.subscriptionsService.getSubscriptionStatus(organizationId);
    const maxActiveUsers = subscriptionResp?.data?.subscription_plan?.max_users;
    const maxAdmins = subscriptionResp?.data?.subscription_plan?.max_admins;

    const saved = await this.userRepository.manager.transaction(
      async (manager) => {
        const repo = manager.getRepository(User);

        const activeNonAdminCount = await repo.count({
          where: {
            organization: { id: organizationId },
            role: { slug: Not(RoleName.ADMINISTRATOR) },
            status: USER_STATUS.ACTIVE,
          },
        });

        const adminCount = await repo.count({
          where: {
            organization: { id: organizationId },
            role: { slug: RoleName.ADMINISTRATOR },
          },
        });

        const becomingAdmin =
          user.role?.slug !== RoleName.ADMINISTRATOR &&
          newRole?.slug === RoleName.ADMINISTRATOR;
        if (typeof maxAdmins === 'number' && becomingAdmin) {
          if (adminCount >= maxAdmins) {
            throw new BadRequestException(
              `You cannot have more than ${maxAdmins} administrators as per current subscription`,
            );
          }
        }

        const demotingAdmin =
          user.role?.slug === RoleName.ADMINISTRATOR &&
          newRole?.slug !== RoleName.ADMINISTRATOR;
        if (demotingAdmin && adminCount <= 1) {
          throw new BadRequestException(
            'Cannot remove the only administrator from the organization',
          );
        }

        // If current user is an administrator and request is to set status INACTIVE,
        // ensure there's at least one other admin.
        const isCurrentlyAdmin = user.role?.slug === RoleName.ADMINISTRATOR;
        // const willBeAdmin = newRole?.slug === RoleName.ADMINISTRATOR;
        const wantsToBecomeInactive = status === USER_STATUS.INACTIVE;

        // If they're currently an admin and are being set inactive (and there is only one admin), block it.
        if (isCurrentlyAdmin && wantsToBecomeInactive && adminCount <= 1) {
          throw new BadRequestException(
            'Cannot deactivate the only administrator in the organization',
          );
        }
        // --------------------------------------------------

        const effectiveRoleSlug = newRole?.slug ?? user.role?.slug;
        const willBeActive = status
          ? status === USER_STATUS.ACTIVE
          : user.status === USER_STATUS.ACTIVE;
        const isCurrentlyActive = user.status === USER_STATUS.ACTIVE;

        if (
          !isCurrentlyActive &&
          willBeActive &&
          effectiveRoleSlug !== RoleName.ADMINISTRATOR &&
          typeof maxActiveUsers === 'number'
        ) {
          if (activeNonAdminCount >= maxActiveUsers) {
            // max users check is removed temporarily
            // throw new BadRequestException(
            //   `You cannot have more than ${maxActiveUsers} active users as per current subscription`,
            // );
          }
        }

        if (firstName !== undefined) user.first_name = firstName;
        if (lastName !== undefined) user.last_name = lastName;
        if (status !== undefined) user.status = status;
        if (roleName) user.role = newRole;

        user.updated_by = loggedInUser;

        const updated = await repo.save(user);

        return updated;
      },
    );

    if (oldRole !== saved.role?.slug) {
      await this.auditLogsService.createLog({
        organization_id: loggedInUser.organization_id,
        actor_id: loggedInUser.id,
        role: loggedInUser.role?.slug,
        action: AuditAction.USER_ROLE_CHANGE,
        module_id: userId,
        module_name: 'User',
        message: `User with name ${user.fullName} role changed to ${user.role?.slug}. User id ${user.id}`,
        payload: {
          before: { oldRole },
          after: { newRole: user.role },
        },
        ip_address: req.ip,
        device_info: req.headers['user-agent'],
      });
    }
    return {
      success: true,
      message: 'User updated',
      data: saved,
    };
  }

  async deleteUser(
    userId: string,
    organizationId: string,
    loggedInUser: User,
    req: Request,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true, organization: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (!user.organization || user.organization.id !== organizationId) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    if (user.role?.slug === RoleName.ADMINISTRATOR) {
      throw new BadRequestException('Cannot delete an administrator');
    }

    user.deleted_by = loggedInUser;

    await this.userRepository.save(user);

    await this.userRepository.softDelete(user.id);

    await this.auditLogsService.createLog({
      organization_id: loggedInUser.organization_id,
      actor_id: loggedInUser.id,
      role: loggedInUser.role?.slug,
      action: AuditAction.USER_DELETED,
      module_id: userId,
      module_name: 'User',
      message: `User with name ${user.fullName} deleted. User id ${user.id}`,
      ip_address: req.ip,
      device_info: req.headers['user-agent'],
    });

    return {
      success: true,
      message: 'User deleted successfully',
      user,
    };
  }

  private async handlePhotoUpload(photoUrl: string): Promise<string | null> {
    try {
      const response = await axios.get<Buffer>(photoUrl, {
        responseType: 'arraybuffer',
      });

      const fileBuffer = Buffer.from(response.data);
      const mimeType: string =
        (response.headers['content-type'] as string) || 'image/jpeg';
      const key = `users/${randomUUID()}.${mimeType.split('/')[1]}`;

      // Mock the Express.Multer.File structure
      const file: Express.Multer.File = {
        fieldname: 'photo',
        originalname: key,
        encoding: '7bit',
        mimetype: mimeType,
        buffer: fileBuffer,
        size: fileBuffer.length,
        stream: Readable.from(fileBuffer),
        destination: '',
        filename: key,
        path: '',
      };

      await this.uploadsService.uploadFile(file, key);

      return key;
    } catch (error) {
      this.logger.error(`Failed to process photo: ${error}`);
      return null;
    }
  }

  async findOrganizationAdmins(organizationId: string) {
    const organizationAdmins = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .where('user.organization_id = :orgId', { orgId: organizationId })
      .andWhere('role.slug = :roleSlug', { roleSlug: RoleName.ADMINISTRATOR })
      .getMany();

    return organizationAdmins;
  }
}
