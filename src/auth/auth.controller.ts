import {
  Controller,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User } from 'src/users/entities/user.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { UserUtilsService } from 'src/users/users-utils.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { AuditAction } from 'src/audit-logs/entities/audit-logs.entity';

@Controller('auth')
export class AuthController {
  private frontendUrl: string;
  private logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly userUtilsService: UserUtilsService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@CurrentUser() user: User, @Req() req: Request) {
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    this.userUtilsService.setLastLogin(user).catch((error) => {
      this.logger.error(
        `Failed to set last login for user ${user.id}, error: ${error}`,
      );
    });

    if (user.organization_id) {
      await this.auditLogsService.createLog({
        organization_id: user?.organization_id, // Assume user has organization_id
        actor_id: user.id,
        role: user.role?.slug,
        action: AuditAction.USER_LOGIN,
        module_name: 'User',
        message: 'Successful login',
        ip_address: req.ip,
        device_info: req.headers['user-agent'],
      });
    }

    return this.authService.login(user);
  }

  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  refresh(@CurrentUser() user: User) {
    return this.authService.login(user);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // The actual authentication will be handled by the GoogleStrategy.
    // This route will trigger the Google OAuth2 flow.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleLoginCallback(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    // if not user redirect to frontend with not token.
    if (!req.user) {
      return res.redirect(this.frontendUrl);
    }
    const { access_token, refresh_token } = await this.authService.login(
      req.user as User,
    );

    if ((req.user as User).organization_id) {
      await this.auditLogsService.createLog({
        organization_id: (req.user as User)?.organization_id, // Assume user has organization_id
        actor_id: (req.user as User).id,
        role: (req.user as User).role?.slug,
        action: AuditAction.USER_LOGIN,
        module_name: 'User',
        message: 'Successful login',
        ip_address: req.ip,
        device_info: req.headers['user-agent'],
      });
    }

    // Redirect to a page or return the JWT token as a response.
    return res.redirect(
      `${this.frontendUrl}/signin?token=${access_token}&refresh_token=${refresh_token}`,
    );
  }
}
