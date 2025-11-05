import { forwardRef, Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationsController } from './organizations.controller';
import { CallScriptsModule } from 'src/call-scripts/call-scripts.module';
import { RolesModule } from 'src/roles/roles.module';
import { PatientsModule } from 'src/patients/patients.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
    CallScriptsModule,
    RolesModule,
    PatientsModule,
    forwardRef(() => SubscriptionsModule),
  ],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
