import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserUtilsService } from 'src/users/users-utils.service';
import { USER_STATUS } from 'src/users/enums/user-status.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userUtilsService: UserUtilsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.userUtilsService.findById(payload.sub);

    if (user?.deleted_at) {
      throw new BadRequestException(
        'Your account has been deleted. Please contact administrator',
      );
    }

    if (user?.status === USER_STATUS.INACTIVE) {
      throw new BadRequestException(
        'Your account is inactive. Please contact administrator',
      );
    }

    return user;
  }
}
