import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GetCallsQuery } from './dto/get-today-calls.dto';
import { Permission } from 'src/roles/enums/roles-permissions.enum';
import { User } from 'src/users/entities/user.entity';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PATIENTS)
  @Get('upcoming')
  list(@CurrentUser() user: User, @Query() getCallsQuery: GetCallsQuery) {
    if (!user.organization_id)
      throw new BadRequestException('User does not belong to any organization');
    return this.callsService.listTodaysCalls(
      user.organization_id,
      getCallsQuery,
      user,
    );
  }
}
