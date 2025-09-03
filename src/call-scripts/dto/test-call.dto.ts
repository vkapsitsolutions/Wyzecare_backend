import { IsPhoneNumber, IsString } from 'class-validator';

export class TestCallDto {
  @IsString()
  @IsPhoneNumber()
  phoneNumber: string;
}
