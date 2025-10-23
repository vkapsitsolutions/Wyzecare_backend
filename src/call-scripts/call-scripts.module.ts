import { forwardRef, Module } from '@nestjs/common';
import { CallScriptsService } from './call-scripts.service';
import { CallScriptsController } from './call-scripts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallScript } from './entities/call-script.entity';
import { ScriptQuestion } from './entities/script-questions.entity';
import { RolesModule } from 'src/roles/roles.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { AiCallingModule } from 'src/ai-calling/ai-calling.module';
import { CallScriptUtilsService } from './call-scripts-utils.service';
import { PatientsModule } from 'src/patients/patients.module';
import { CallsModule } from 'src/calls/calls.module';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { CallSchedulesModule } from 'src/call-schedules/call-schedules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallScript, ScriptQuestion]),
    RolesModule,
    forwardRef(() => SubscriptionsModule),
    AiCallingModule,
    PatientsModule,
    CallsModule,
    forwardRef(() => AuditLogsModule),
    CallSchedulesModule,
  ],
  controllers: [CallScriptsController],
  providers: [CallScriptsService, CallScriptUtilsService],
  exports: [CallScriptUtilsService],
})
export class CallScriptsModule {}
