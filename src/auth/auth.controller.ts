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

@Controller('auth')
export class AuthController {
  private frontendUrl: string;
  private logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly userUtilsService: UserUtilsService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@CurrentUser() user: User) {
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    this.userUtilsService.setLastLogin(user).catch((error) => {
      this.logger.error(
        `Failed to set last login for user ${user.id}, error: ${error}`,
      );
    });

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

    // Redirect to a page or return the JWT token as a response.
    return res.redirect(
      `${this.frontendUrl}/signin?token=${access_token}&refresh_token=${refresh_token}`,
    );
  }
}
