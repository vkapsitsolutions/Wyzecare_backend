import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-logs.entity';
import { AuditLogsController } from './audit-logs.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), SubscriptionsModule],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
  controllers: [AuditLogsController],
})
export class AuditLogsModule {}
