import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { GetPatientCallHistoryDto } from './dto/get-patient-call-history.dto';
import { PatientAccessGuard } from 'src/patients/guards/patient-access.guard';
import { PatientAccessDecorator } from 'src/roles/decorators/patient-access.decorator';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PatientAccessGuard)
  @PatientAccessDecorator('read')
  @Get('call-history/:patientId')
  getPatientCallHistory(
    @Param('patientId', ParseUUIDPipe) id: string,
    @Query() getPatientCallHistoryDto: GetPatientCallHistoryDto,
  ) {
    return this.callsService.getCallHistoryForPatient(
      id,
      getPatientCallHistoryDto,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PatientAccessGuard)
  @PatientAccessDecorator('read')
  @Get('call-history/:patientId/:callRunId')
  getOneCall(
    @Param('callRunId', ParseUUIDPipe) callRunId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.callsService.getOneCall(callRunId, patientId);
  }
}
