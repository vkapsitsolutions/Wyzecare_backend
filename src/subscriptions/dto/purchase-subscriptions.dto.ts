import { IsInt, IsPositive, Max } from 'class-validator';

export class PurchaseSubscriptionDto {
  @IsPositive()
  @IsInt()
  @Max(1000)
  patientLicensesCount: number = 1;
}
