import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertHistory } from './entites/alert-history.entity';
import { Alert } from './entites/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, AlertHistory])],
  providers: [AlertsService],
  controllers: [AlertsController],
})
export class AlertsModule {}
