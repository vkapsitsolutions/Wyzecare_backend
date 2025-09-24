import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';
import { CallsController } from './calls.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RolesModule } from 'src/roles/roles.module';
import { CallRun } from './entities/call-runs.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AiCallingModule } from 'src/ai-calling/ai-calling.module';
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallUtilsService } from './call-utils.service';
import { Patient } from 'src/patients/entities/patient.entity';
import { SchedulerService } from './scheduler.service';
import { AlertsModule } from 'src/alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallRun, Call, CallSchedule, Patient]),
    ScheduleModule.forRoot(),
    SubscriptionsModule,
    RolesModule,
    AiCallingModule,
    AlertsModule,
  ],
  providers: [CallsService, SchedulerService, CallUtilsService],
  controllers: [CallsController],
  exports: [CallsService, CallUtilsService],
})
export class CallsModule {}
