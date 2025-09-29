import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AlertsModule } from 'src/alerts/alerts.module';
import { ReportsController } from './reports.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { PatientsModule } from 'src/patients/patients.module';
import { CallsModule } from 'src/calls/calls.module';
import { CallScriptsModule } from 'src/call-scripts/call-scripts.module';

@Module({
  imports: [
    AlertsModule,
    SubscriptionsModule,
    PatientsModule,
    CallsModule,
    CallScriptsModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
