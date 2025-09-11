import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Call])],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
