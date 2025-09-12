import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';
import { CallsController } from './calls.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RolesModule } from 'src/roles/roles.module';
import { CallRun } from './entities/call-runs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallRun, Call]),
    SubscriptionsModule,
    RolesModule,
  ],
  providers: [CallsService],
  exports: [CallsService],
  controllers: [CallsController],
})
export class CallsModule {}
