import { Module } from '@nestjs/common';
import { CallScriptsService } from './call-scripts.service';
import { CallScriptsController } from './call-scripts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallScript } from './entities/call-script.entity';
import { ScriptQuestion } from './entities/script-questions.entity';
import { RolesModule } from 'src/roles/roles.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { AiCallingModule } from 'src/ai-calling/ai-calling.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallScript, ScriptQuestion]),
    RolesModule,
    SubscriptionsModule,
    AiCallingModule,
  ],
  controllers: [CallScriptsController],
  providers: [CallScriptsService],
})
export class CallScriptsModule {}
