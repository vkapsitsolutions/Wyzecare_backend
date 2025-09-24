import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { UpdateAlertStatusDto } from './dto/update-status.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get('counts')
  async getAlertCounts() {
    return this.alertsService.getDashboardCounts();
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get()
  getAlerts(@Query() getAlertsDto: GetAlertsDto, @CurrentUser() user: User) {
    return this.alertsService.findAlerts(getAlertsDto, user);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get(':id')
  getAlertDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.getAlertDetails(id, user);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get(':id/history')
  getAlertHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.getAlertHistory(id);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Post(':id/update-status')
  updateAlertStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateAlertStatusDto,
  ) {
    return this.alertsService.updateAlertStatus(id, dto, user);
  }
}
