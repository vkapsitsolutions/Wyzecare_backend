import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';
import { UserUtilsService } from 'src/users/users-utils.service';
import * as argon2 from 'argon2';
import { JwtTokenService } from './jwt-token.service';
import { USER_STATUS } from 'src/users/enums/user-status.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userUtilsService: UserUtilsService,

    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.userUtilsService.findByEmailForInternal(username);
    if (user?.status !== USER_STATUS.INACTIVE)
      throw new BadRequestException(
        'Your account is inactive. Please contact administrator',
      );
    if (user && (await argon2.verify(user.password, pass))) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const { accessToken, refreshToken } =
      this.jwtTokenService.generateTokens(user);

    await this.userUtilsService.setCurrentRefreshToken(user.id, refreshToken);

    return {
      success: true,
      message: 'Logged in successfully',
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
