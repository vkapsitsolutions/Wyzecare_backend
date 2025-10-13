import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { AuthController } from './auth.controller';
import { JwtTokenService } from './jwt-token.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresIn: configService.getOrThrow<any>('JWT_ACCESS_TOKEN_EXPIRES'),
          algorithm: 'HS512',
        },
      }),
      inject: [ConfigService],
    }),

    forwardRef(() => UsersModule),
    AuditLogsModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    RefreshStrategy,
    JwtTokenService,
    GoogleStrategy,
  ],
  controllers: [AuthController],
  exports: [JwtTokenService],
})
export class AuthModule {}
