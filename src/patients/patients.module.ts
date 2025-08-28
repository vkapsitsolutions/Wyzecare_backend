import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RolesModule } from 'src/roles/roles.module';
import { PatientConsentsModule } from 'src/patient-consents/patient-consents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    SubscriptionsModule,
    RolesModule,
    PatientConsentsModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
