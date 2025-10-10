import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { GetAuditLogsDto } from './dto/get-audti-logs.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get()
  getAuditLogs(
    @Query() getAuditLogsDto: GetAuditLogsDto,
    @CurrentUser() user: User,
  ) {
    if (!user.organization_id) {
      throw new BadRequestException('User not belongs to any organization');
    }
    return this.auditLogsService.getAuditLogs(
      getAuditLogsDto,
      user.organization_id,
    );
  }
}
