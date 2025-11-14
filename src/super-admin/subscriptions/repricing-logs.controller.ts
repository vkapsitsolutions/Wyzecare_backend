import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RepricingLogService } from './repricing-logs.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/roles/guards/roles.guard';
import { RequiredRoles } from 'src/roles/decorators/roles.decorator';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { RepricingLogsDto } from './dto/repricing-logs.dto';

@Controller('super-admin/repricing-logs')
export class RepricingLogsController {
  constructor(private readonly repricingLogsService: RepricingLogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequiredRoles(RoleName.SUPER_ADMIN)
  @Get()
  findRepricingLogs(@Query() repricingLogsDto: RepricingLogsDto) {
    return this.repricingLogsService.findRepricingLogs(repricingLogsDto);
  }
}
