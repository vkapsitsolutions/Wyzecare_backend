import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AlertsModule } from 'src/alerts/alerts.module';
import { ReportsController } from './reports.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { PatientsModule } from 'src/patients/patients.module';
import { CallsModule } from 'src/calls/calls.module';

@Module({
  imports: [AlertsModule, SubscriptionsModule, PatientsModule, CallsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
