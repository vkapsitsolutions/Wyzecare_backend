import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { SmsService } from './sms.service';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationPreferencesService: NotificationPreferenceService,
    private readonly smsService: SmsService,
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
}
