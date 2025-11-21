import { IsNumberString } from 'class-validator';

export class ConfirmPhoneOtpDto {
  @IsNumberString()
  otp: string;
}
