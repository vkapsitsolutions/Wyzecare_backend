import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
    return this.callScriptsService.create(
      createCallScriptDto,
      loggedInUser.organization_id,
      loggedInUser,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get()
  findAll(@CurrentUser() loggedInUser: User) {
    return this.callScriptsService.findAll(loggedInUser.organization_id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() loggedInUser: User,
  ) {
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
    return this.callScriptsService.remove(id, loggedInUser.organization_id);
  }
}
