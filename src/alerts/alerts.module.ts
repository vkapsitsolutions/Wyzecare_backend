import { forwardRef, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertHistory } from './entities/alert-history.entity';
import { Alert } from './entities/alert.entity';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { CallsModule } from 'src/calls/calls.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, AlertHistory]),
    SubscriptionsModule,
    forwardRef(() => CallsModule),
  ],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
