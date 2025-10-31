import { IsPhoneNumber } from 'class-validator';

export class PhoneNumberDto {
  @IsPhoneNumber()
  phoneNumber: string;
}
