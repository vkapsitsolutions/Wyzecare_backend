import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsEmail()
  @Transform(({ value }: { value: string }) =>
    value ? value.toLowerCase() : value,
  )
  email: string;

  @IsString()
  token: string;

  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      minUppercase: 1,
    },
    {
      message:
        'Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.',
    },
  )
  password: string;
}
