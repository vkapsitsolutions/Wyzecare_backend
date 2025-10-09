import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('CALLBACK_URL'), // e.g., 'http://localhost:3000/auth/google/callback'
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      name: { givenName: string; familyName: string };
      emails: { value: string }[];
      photos: { value: string }[];
    },
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;
    const googleUser = {
      googleId: id,
      email: emails[0].value.toLowerCase().trim(),
      firstName: name.givenName,
      lastName: name.familyName,
      photo: photos[0]?.value,
    };
    const user = await this.usersService.findOrCreateSocialUser(googleUser);

    done(null, user);
  }
}
