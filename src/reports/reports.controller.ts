import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { ReportsDashboardCountQueryDto } from './dto/reports-dahsboard-count-query';
import { GetDailyPerformanceBreakDown } from './dto/daily-performace-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get('dashboard-counts')
  getOrganizationMetrics(@CurrentUser() user: User) {
    if (!user.organization_id) {
      throw new BadRequestException(`User not belongs to any organization`);
    }
    return this.reportsService.getOrganizationMetrics(user.organization_id);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get('reports-dashboard-counts')
  getReportsDashboardCounts(
    @CurrentUser() user: User,
    @Query() query: ReportsDashboardCountQueryDto,
  ) {
    if (!user.organization_id) {
      throw new BadRequestException(`User not belongs to any organization`);
    }
    return this.reportsService.getReportsDashboardCount(
      user.organization_id,
      query,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get('monthly-success-rate')
  getMonthlySuccessRates(@CurrentUser() user: User) {
    if (!user.organization_id) {
      throw new BadRequestException('User not belongs to any organization');
    }
    return this.reportsService.getMonthlySuccessRate(user.organization_id);
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get('daily-performance-breakdown')
  dailyPerformanceBreakdown(
    @CurrentUser() user: User,
    @Query() query: GetDailyPerformanceBreakDown,
  ) {
    if (!user.organization_id) {
      throw new BadRequestException('User not belongs to any organization');
    }
    return this.reportsService.getDailyPerformanceBreakDown(
      user.organization_id,
      query,
    );
  }
}
