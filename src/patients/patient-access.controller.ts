import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Permission, RoleName } from 'src/roles/enums/roles-permissions.enum';
import { PatientAccessService } from './patient-access.service';
import { AssignPatientsDto } from './dto/assign-patients.dto';
import { RequiredRoles } from 'src/roles/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/roles/guards/roles.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('patient-access')
export class PatientAccessController {
  constructor(private readonly patientAccessService: PatientAccessService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Get('user-list')
  getUserListWithPatientCounts(@CurrentUser() user: User) {
    return this.patientAccessService.listUsersWithAccessCounts(user);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Get(':userId/accessible')
  getAccessiblePatients(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.patientAccessService.getAccessiblePatients(userId);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, RolesGuard)
  @Post('assign/:userId')
  @RequiredRoles(RoleName.ADMINISTRATOR)
  async assignPatientsToUser(
    @Param('userId') targetUserId: string,
    @Body() assignPatientsDto: AssignPatientsDto,
  ) {
    return this.patientAccessService.assignPatientsToUser(
      targetUserId,
      assignPatientsDto,
    );
  }
}
