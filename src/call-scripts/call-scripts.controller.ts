import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CallScriptsService } from './call-scripts.service';
import { CreateCallScriptDto } from './dto/create-call-script.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission } from 'src/roles/enums/roles-permissions.enum';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { UpdateCallScriptDto } from './dto/update-call-script.dto';
import { ListCallScriptDto } from './dto/list-call-scripts.dto';
import { TestCallDto } from './dto/test-call.dto';
import { AssignCallScriptToPatientsDto } from './dto/assign-script.dto';

@Controller('call-scripts')
export class CallScriptsController {
  constructor(private readonly callScriptsService: CallScriptsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Post()
  create(
    @Body() createCallScriptDto: CreateCallScriptDto,
    @CurrentUser() loggedInUser: User,
  ) {
    if (!loggedInUser.organization_id) return;
    return this.callScriptsService.create(
      createCallScriptDto,
      loggedInUser.organization_id,
      loggedInUser,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get()
  findAll(
    @CurrentUser() loggedInUser: User,
    @Query() listCallScriptsDto: ListCallScriptDto,
  ) {
    if (!loggedInUser.organization_id) return;
    return this.callScriptsService.findAll(
      loggedInUser.organization_id,
      listCallScriptsDto,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() loggedInUser: User,
  ) {
    if (!loggedInUser.organization_id) return;
    return this.callScriptsService.findOne(id, loggedInUser.organization_id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCallScriptDto: UpdateCallScriptDto,
    @CurrentUser() loggedInUser: User,
  ) {
    if (!loggedInUser.organization_id) return;
    return this.callScriptsService.update(
      id,
      updateCallScriptDto,
      loggedInUser.organization_id,
      loggedInUser,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() loggedInUser: User,
  ) {
    if (!loggedInUser.organization_id) return;
    return this.callScriptsService.remove(id, loggedInUser.organization_id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Post(':id/test-script')
  testScriptCall(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() loggedInUser: User,
    @Body() testCallDto: TestCallDto,
  ) {
    if (!loggedInUser.organization_id) return;
    return this.callScriptsService.testCallScript(
      id,
      loggedInUser.organization_id,
      testCallDto,
      loggedInUser,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Post(':id/assign-patients')
  assignScriptToPatients(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignScriptDto: AssignCallScriptToPatientsDto,
  ) {
    return this.callScriptsService.assignPatients(id, assignScriptDto);
  }
}
