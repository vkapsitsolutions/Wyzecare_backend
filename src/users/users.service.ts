import {
  BadRequestException,
  ConflictException,
  Injectable,
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly userUtilsService: UserUtilsService,

    private readonly verificationsService: VerificationsService,

    private readonly jwtTokenService: JwtTokenService,
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

  getProfile(user: User) {
    return {
      success: true,
      message: 'User retrieved success',
      user,
    };
  }
}
