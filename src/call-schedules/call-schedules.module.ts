import { Module } from '@nestjs/common';
import { CallSchedulesService } from './call-schedules.service';

@Module({
  providers: [CallSchedulesService],
})
export class CallSchedulesModule {}
