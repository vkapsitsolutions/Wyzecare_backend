import {
  BadGatewayException,
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
import { NotificationPreferenceService } from './notification-preferences.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { USER_TYPE } from 'src/users/enums/user-type.enum';
import { RolesGuard } from 'src/roles/guards/roles.guard';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { RequiredRoles } from 'src/roles/decorators/roles.decorator';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { DeliveryStatusLogsService } from './delivery-logs.service';
import { GetDeliveryStatusLogsDto } from './dto/get-delivery-status-logs.dto';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationPreferencesService: NotificationPreferenceService,
    private readonly deliveryLogsService: DeliveryStatusLogsService,
    // private readonly smsService: SmsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('preferences/:id')
  getUserPreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationPreferencesService.getOrCreatePreference(
      id,
      user.user_type === USER_TYPE.NORMAL ? true : false,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('preferences/toggle-sms')
  toggleSmsNotifications(@CurrentUser() user: User) {
    return this.notificationPreferencesService.toggleSms(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequiredRoles(RoleName.ADMINISTRATOR)
  @Patch('preferences/:id')
  updatePreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdatePreferencesDto,
  ) {
    return this.notificationPreferencesService.updatePreference(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequiredRoles(RoleName.ADMINISTRATOR)
  @Get('delivery-logs')
  async getDeliveryLogs(
    @CurrentUser() user: User,
    @Query() query: GetDeliveryStatusLogsDto,
  ) {
    const organization_id = user.organization_id;
    if (!organization_id) {
      throw new BadGatewayException('User does not belong to any organization');
    }
    return this.deliveryLogsService.getByOrganization(organization_id, query);
  }

  @Post('temp-test-sms')
  temp() {
    // return this.smsService.sendAlertSms(
    //   '+918982975277',
    //   'Jimmy Snow',
    //   AlertSeverity.IMPORTANT,
    //   'High Blood Pressure',
    //   'Patient blood pressure is critically high.',
    //   'https://staging.wyze.care/alerts',
    // );
  }
}
