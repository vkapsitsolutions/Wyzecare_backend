import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateRefreshToken(payload: { sub: string }) {
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES'),
    });

    return refreshToken;
  }

  generateTokens(user: User) {
    const payload = {
      sub: user.id,
    };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.generateRefreshToken(payload);

    return { accessToken, refreshToken };
  }
}
