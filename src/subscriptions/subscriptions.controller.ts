import {
  Controller,
  Get,
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
    return this.subscriptionsService.getSubscriptionStatus(user);
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
}
