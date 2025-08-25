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
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserUtilsService } from './users-utils.service';
import { VerificationsService } from 'src/verifications/verifications.service';
import {
  Verification,
  VerificationStatus,
  VerificationType,
} from 'src/verifications/entitiies/verification.entity';
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

  async getProfile(user: User) {
    const photo = await this.uploadsService.getFile(user.photo);

    if (photo) user.photo = photo;

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
    const { role, status } = query;

    const where: FindOptionsWhere<User> = {
      organization: { id: organizationId },
    };

    if (role) {
      where.role = { slug: role };
    }

    if (status) {
      where.status = status;
    }

    const users = await this.userRepository.find({
      where,
      relations: { role: true },
      order: { created_at: 'DESC' },
    });

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

  async toggleUserStatus(userId: string, organizationId: string) {
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
        throw new BadRequestException(
          `You cannot have more than ${maxActiveUsers} active users as per current subscription`,
        );
      }
    }

    user.status =
      user.status === USER_STATUS.ACTIVE
        ? USER_STATUS.INACTIVE
        : USER_STATUS.ACTIVE;
    const savedUser = await this.userRepository.save(user);

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
  ) {
    const { firstName, lastName, roleName, status } = editUserDto;

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

        const effectiveRoleSlug = newRole?.slug ?? user.role?.slug;
        const willBeActive = status
          ? status === USER_STATUS.ACTIVE
          : user.status === USER_STATUS.ACTIVE;
        const isCurrentlyActive = user.status === USER_STATUS.ACTIVE;

        // If user is not currently active but will be active, and they are NOT an admin,
        // then check seat limit.
        if (
          !isCurrentlyActive &&
          willBeActive &&
          effectiveRoleSlug !== RoleName.ADMINISTRATOR &&
          typeof maxActiveUsers === 'number'
        ) {
          if (activeNonAdminCount >= maxActiveUsers) {
            throw new BadRequestException(
              `You cannot have more than ${maxActiveUsers} active users as per current subscription`,
            );
          }
        }

        if (firstName !== undefined) user.first_name = firstName;
        if (lastName !== undefined) user.last_name = lastName;
        if (status !== undefined) user.status = status;
        if (roleName) user.role = newRole;

        const updated = await repo.save(user);
        return updated;
      },
    );

    return {
      success: true,
      message: 'User updated',
      data: saved,
    };
  }

  async deleteUser(userId: string, organizationId: string) {
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

    await this.userRepository.softDelete(user.id);

    return {
      success: true,
      message: 'User deleted successfully',
      user,
    };
  }
}
