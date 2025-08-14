import { IsEmail } from 'class-validator';

export class InitiateVerificationDto {
  @IsEmail()
  email: string;
}
