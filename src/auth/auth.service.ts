import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { UserUtilsService } from 'src/users/users-utils.service';
import * as argon2 from 'argon2';
import { JwtTokenService } from './jwt-token.service';
import { USER_STATUS } from 'src/users/enums/user-status.enum';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { AuditAction } from 'src/audit-logs/entities/audit-logs.entity';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly userUtilsService: UserUtilsService,

    private readonly jwtTokenService: JwtTokenService,

    private readonly auditLogsService: AuditLogsService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
    req: Request,
  ): Promise<User | null> {
    const user = await this.userUtilsService.findByEmailForInternal(username);
    if (user?.deleted_at) {
      throw new BadRequestException(
        'Your account has been deleted. Please contact administrator',
      );
    }
    if (user?.status === USER_STATUS.INACTIVE)
      throw new BadRequestException(
        'Your account is inactive. Please contact administrator',
      );
    if (!user?.password) {
      return null;
    }
    if (user && (await argon2.verify(user.password, pass))) {
      return user;
    } else {
      if (user && user.organization_id) {
        await this.auditLogsService.createLog({
          organization_id: user.organization_id, // Or derive from attempted email if possible
          actor_id: user.id,
          reason: 'Invalid username or password',
          action: AuditAction.FAILED_LOGIN,
          module_name: 'User',
          message: 'Failed login attempt',
          payload: { attempted_email: username }, // Optional details
          ip_address: req.ip,
          device_info: req.headers['user-agent'],
        });
      }
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
