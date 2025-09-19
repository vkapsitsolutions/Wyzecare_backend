import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientContactDto } from './dto/patient-contacts.dto';
import { GetPatientsQuery } from './dto/get-patients-query.dto';
import { MedicalInfoDto } from './dto/medical-info.dto';
import { HipaaAuthorizationService } from 'src/patient-consents/services/hipaa-authorization.service';
import { PatientAccessGuard } from './guards/patient-access.guard';
import { PatientAccessDecorator } from 'src/roles/decorators/patient-access.decorator';

@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly hipaaAuthorizationService: HipaaAuthorizationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('consents/hipaa-authorization/purposes')
  listHipaaAuthorizationPurposes() {
    return this.hipaaAuthorizationService.listAuthorizationPurposes();
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get()
  listPatients(
    @CurrentUser() user: User,
    @Query() listPatientsDto: GetPatientsQuery,
  ) {
    if (!user.organization_id)
      throw new BadRequestException(
        'Users does not belongs to any organization',
      );
    return this.patientsService.listAllPatients(
      user.organization_id,
      listPatientsDto,
      user,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PatientAccessGuard)
  @PatientAccessDecorator('read')
  @Get(':patientId')
  getOnePatient(
    @CurrentUser() user: User,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Post()
  createPatientOrUpdatePatient(
    @CurrentUser() user: User,
    @Body() createPatientDto: CreatePatientDto | UpdatePatientDto,
  ) {
    if (!user.organization_id)
      throw new BadRequestException(
        'Users does not belongs to any organization',
      );
    return this.patientsService.upsertPatient(
      createPatientDto,
      user.organization_id,
      user,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PatientAccessGuard)
  @PatientAccessDecorator('write')
  @Post(':patientId/contacts')
  updatePatientContacts(
    @CurrentUser() user: User,
    @Param('patientId', ParseUUIDPipe) id: string,
    @Body() patientContactData: PatientContactDto,
  ) {
    if (!user.organization_id)
      throw new BadRequestException(
        'Users does not belongs to any organization',
      );
    return this.patientsService.updatePatientContactAndEmergency(
      id,
      user,
      patientContactData,
      user.organization_id,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PatientAccessGuard)
  @PatientAccessDecorator('write')
  @Post(':patientId/medical-info')
  updatePatientMedicalInfo(
    @CurrentUser() user: User,
    @Param('patientId', ParseUUIDPipe) id: string,
    @Body() medicalInfoData: MedicalInfoDto,
  ) {
    if (!user.organization_id)
      throw new BadRequestException(
        'Users does not belongs to any organization',
      );
    return this.patientsService.addOrUpdateMedicalInfo(
      id,
      user.organization_id,
      medicalInfoData,
      user,
    );
  }
}
