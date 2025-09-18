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

@Module({
  imports: [
    TypeOrmModule.forFeature([CallScript, ScriptQuestion]),
    RolesModule,
    forwardRef(() => SubscriptionsModule),
    AiCallingModule,
    PatientsModule,
  ],
  controllers: [CallScriptsController],
  providers: [CallScriptsService, CallScriptUtilsService],
  exports: [CallScriptUtilsService],
})
export class CallScriptsModule {}
