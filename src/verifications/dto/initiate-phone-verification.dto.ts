import { IsPhoneNumber, IsString } from 'class-validator';

export class InitiatePhoneVerificationDto {
  @IsString()
  @IsPhoneNumber()
  readonly phone: string;
}
