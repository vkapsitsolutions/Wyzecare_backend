import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission } from 'src/roles/enums/roles-permissions.enum';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientContactDto } from './dto/patient-contacts.dto';
import { GetPatientsQuery } from './dto/get-patients-query.dto';
import { MedicalInfoDto } from './dto/medical-info.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_ALL_PATIENTS)
  @Get()
  listPatients(
    @CurrentUser() user: User,
    @Query() listPatientsDto: GetPatientsQuery,
  ) {
    return this.patientsService.listAllPatients(
      user.organization_id,
      listPatientsDto,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_ALL_PATIENTS)
  @Get(':id')
  getOnePatient(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Post()
  createPatient(
    @CurrentUser() user: User,
    @Body() createPatientDto: CreatePatientDto,
  ) {
    return this.patientsService.createNewPatient(
      createPatientDto,
      user.organization_id,
      user,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Patch(':id')
  updatePatient(
    @CurrentUser() user: User,
    @Body() updatePatientDto: UpdatePatientDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.updatePatient(
      id,
      updatePatientDto,
      user.organization_id,
      user,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Post(':id/contacts')
  updatePatientContacts(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patientContactData: PatientContactDto,
  ) {
    return this.patientsService.updatePatientContactAndEmergency(
      id,
      user,
      patientContactData,
      user.organization_id,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Post(':id/medical-info')
  updatePatientMedicalInfo(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() medicalInfoData: MedicalInfoDto,
  ) {
    return this.patientsService.addOrUpdateMedicalInfo(
      id,
      user.organization_id,
      medicalInfoData,
      user,
    );
  }
}
