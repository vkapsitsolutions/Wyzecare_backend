import { Module } from '@nestjs/common';
import { CallScriptsService } from './call-scripts.service';
import { CallScriptsController } from './call-scripts.controller';

@Module({
  controllers: [CallScriptsController],
  providers: [CallScriptsService],
})
export class CallScriptsModule {}
