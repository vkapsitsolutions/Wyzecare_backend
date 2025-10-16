import { forwardRef, Module } from '@nestjs/common';
import { CallSchedulesService } from './call-schedules.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSchedule } from './entities/call-schedule.entity';
import { CallSchedulesController } from './call-schedules.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { PatientsModule } from 'src/patients/patients.module';
import { CallScriptsModule } from 'src/call-scripts/call-scripts.module';
import { CallsModule } from 'src/calls/calls.module';
import { RolesModule } from 'src/roles/roles.module';
import { CallRun } from 'src/calls/entities/call-runs.entity';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallSchedule, CallRun]),
    forwardRef(() => SubscriptionsModule),
    PatientsModule,
    CallScriptsModule,
    CallsModule,
    PatientsModule,
    RolesModule,
    forwardRef(() => AuditLogsModule),
  ],
  providers: [CallSchedulesService],
  controllers: [CallSchedulesController],
  exports: [CallSchedulesService],
})
export class CallSchedulesModule {}
