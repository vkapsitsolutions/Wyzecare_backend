import { IsEnum } from 'class-validator';
import { AlertStatus } from '../entites/alert.entity';

export class UpdateAlertStatusDto {
  @IsEnum(AlertStatus)
  newStatus: AlertStatus;
}
