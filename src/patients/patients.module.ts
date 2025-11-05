import { forwardRef, Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RolesModule } from 'src/roles/roles.module';
import { PatientConsentsModule } from 'src/patient-consents/patient-consents.module';
import { PatientAccessService } from './patient-access.service';
import { User } from 'src/users/entities/user.entity';
import { PatientAccessController } from './patient-access.controller';
import { UploadsModule } from 'src/uploads/uploads.module';
import { CallScriptsModule } from 'src/call-scripts/call-scripts.module';
import { PatientMetricsService } from './patient-metrics.service';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { CallSchedulesModule } from 'src/call-schedules/call-schedules.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, User]),
    forwardRef(() => SubscriptionsModule),
    RolesModule,
    PatientConsentsModule,
    UploadsModule,
    forwardRef(() => CallScriptsModule),
    forwardRef(() => AuditLogsModule),
    CallSchedulesModule,
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [PatientsController, PatientAccessController],
  providers: [PatientsService, PatientAccessService, PatientMetricsService],
  exports: [PatientsService, PatientAccessService, PatientMetricsService],
})
export class PatientsModule {}
