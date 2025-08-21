import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my-organization')
  async getMyOrganization(@CurrentUser() user: User) {
    if (!user.organization)
      throw new NotFoundException('Organization not found');
    return this.organizationsService.getOneOrganization(user.organization.id);
  }
}
