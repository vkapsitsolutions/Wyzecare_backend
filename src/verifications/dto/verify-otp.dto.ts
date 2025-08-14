import { IsEmail, IsNotEmpty, IsNumberString } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsNumberString()
  @IsNotEmpty()
  otp: string;
}
