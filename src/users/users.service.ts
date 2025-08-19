import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { UpdateUserDto } from './dto/update-user.dto';
import { UploadsService } from 'src/uploads/uploads.service';
import { randomUUID } from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
    updateUserDto: UpdateUserDto,
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
}
