import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard'; // Adjust path if needed
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { CallSchedulesService } from './call-schedules.service';
import { CreateCallScheduleDto } from './dto/create-schedule.dto';
import { GetCallSchedulesQuery } from './dto/get-schedules-query.dto';
import { UpdateCallScheduleDto } from './dto/update-schedule.dto';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission } from 'src/roles/enums/roles-permissions.enum';
import { ListUpcomingCallsQuery } from './dto/list-upcoming-calls-query.dto';

@Controller('call-schedules')
export class CallSchedulesController {
  constructor(private readonly callSchedulesService: CallSchedulesService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createCallScheduleDto: CreateCallScheduleDto,
  ) {
    if (!user.organization_id)
      throw new BadRequestException('User does not belong to any organization');
    return this.callSchedulesService.create(
      user.organization_id,
      createCallScheduleDto,
      user,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get()
  list(@CurrentUser() user: User, @Query() query: GetCallSchedulesQuery) {
    if (!user.organization_id)
      throw new BadRequestException('User does not belong to any organization');
    return this.callSchedulesService.listAll(user.organization_id, query, user);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get('upcoming-calls')
  getUpcomingCalls(
    @CurrentUser() user: User,
    @Query() query: ListUpcomingCallsQuery,
  ) {
    if (!user.organization_id)
      throw new BadRequestException('User does not belong to any organization');
    return this.callSchedulesService.getSchedulesWithStats({
      organizationId: user.organization_id,
      limit: query.limit,
      page: query.page,
      search: query.keyword,
    });
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    if (!user.organization_id)
      throw new BadRequestException('User does not belong to any organization');
    return this.callSchedulesService.findOne(user.organization_id, id, user);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCallScheduleDto: UpdateCallScheduleDto,
  ) {
    if (!user.organization_id)
      throw new BadRequestException('User does not belong to any organization');
    return this.callSchedulesService.update(
      user.organization_id,
      id,
      updateCallScheduleDto,
      user,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    if (!user.organization_id)
      throw new BadRequestException('User does not belong to any organization');
    return this.callSchedulesService.remove(user.organization_id, id, user);
  }
}
