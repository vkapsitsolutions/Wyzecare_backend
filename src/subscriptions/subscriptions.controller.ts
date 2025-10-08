import {
  BadRequestException,
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
  @UseGuards(JwtAuthGuard)
  purchaseSubscription(
    @CurrentUser() user: User,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.subscriptionsService.purchaseSubscription(user, planId);
  }

  @Get('manage-subscription/customer-portal')
  @UseGuards(JwtAuthGuard)
  manageSubscriptions(@CurrentUser() user: User) {
    const organizationId = user.organization_id;
    if (!organizationId)
      throw new BadRequestException('User do not belongs to any organization');
    return this.subscriptionsService.getCustomerPortalUrl(organizationId);
  }
}
