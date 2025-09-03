import { Module } from '@nestjs/common';
import { AiCallingService } from './ai-calling.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [AiCallingService],
  exports: [AiCallingService],
})
export class AiCallingModule {}
