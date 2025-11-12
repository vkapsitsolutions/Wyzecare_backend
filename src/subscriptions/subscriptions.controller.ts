import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { PurchaseSubscriptionDto } from './dto/purchase-subscriptions.dto';
import { ActiveSubscriptionsGuard } from './guards/active-subscriptions.guard';
import { AddLicensesDto } from './dto/add-licences.dto';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission, RoleName } from 'src/roles/enums/roles-permissions.enum';
import { ReduceLicensesDto } from './dto/reduce-licenses.dto';
import { RolesGuard } from 'src/roles/guards/roles.guard';
import { RequiredRoles } from 'src/roles/decorators/roles.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async findAll() {
    return this.subscriptionsService.findAll();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getSubscriptionStatus(@CurrentUser() user: User) {
    if (!user.organization)
      throw new NotFoundException('Organization not found');
    return this.subscriptionsService.getSubscriptionStatus(
      user.organization?.id,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Post('purchase/:planId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequiredRoles(RoleName.ADMINISTRATOR)
  purchaseSubscription(
    @CurrentUser() user: User,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() purchaseSubscriptionsDto: PurchaseSubscriptionDto,
  ) {
    return this.subscriptionsService.purchaseSubscription(
      user,
      planId,
      purchaseSubscriptionsDto.patientLicensesCount,
    );
  }

  @Get('manage-subscription/customer-portal')
  @UseGuards(JwtAuthGuard)
  manageSubscriptions(@CurrentUser() user: User) {
    const organizationId = user.organization_id;
    if (!organizationId)
      throw new BadRequestException('User do not belongs to any organization');
    return this.subscriptionsService.getCustomerPortalUrl(organizationId);
  }

  @Post('add-licenses')
  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.SYSTEM_SETTINGS)
  addLicenses(
    @CurrentUser() user: User,
    @Body() addLicensesDto: AddLicensesDto,
  ) {
    const organizationId = user.organization_id;
    if (!organizationId)
      throw new BadRequestException('User do not belongs to any organization');
    return this.subscriptionsService.addLicenses(
      organizationId,
      addLicensesDto.additionalLicenses,
      user,
    );
  }

  @Post('reduce-licenses')
  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard, PermissionsGuard)
  @RequirePermissions(Permission.SYSTEM_SETTINGS)
  reduceLicenses(
    @CurrentUser() user: User,
    @Body() reduceLicenses: ReduceLicensesDto,
  ) {
    const organizationId = user.organization_id;
    if (!organizationId)
      throw new BadRequestException('User do not belongs to any organization');
    return this.subscriptionsService.reduceLicenses(
      organizationId,
      reduceLicenses.licensesToReduce,
      user,
    );
  }
}
