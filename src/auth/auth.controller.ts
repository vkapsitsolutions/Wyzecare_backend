import {
  Controller,
  Logger,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User } from 'src/users/entities/user.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { UserUtilsService } from 'src/users/users-utils.service';

@Controller('auth')
export class AuthController {
  private logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly userUtilsService: UserUtilsService,
  ) {}

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
}
