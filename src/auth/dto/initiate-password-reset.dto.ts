import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class InitiatePasswordResetDto {
  @IsString()
  @IsEmail()
  @Transform(({ value }: { value: string }) =>
    value ? value.toLowerCase() : value,
  )
  email: string;
}
