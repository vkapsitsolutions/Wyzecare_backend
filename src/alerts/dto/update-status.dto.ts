import { IsEnum } from 'class-validator';
import { AlertStatus } from '../entities/alert.entity';

export class UpdateAlertStatusDto {
  @IsEnum(AlertStatus)
  newStatus: AlertStatus;
}
