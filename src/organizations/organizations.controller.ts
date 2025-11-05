import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission } from 'src/roles/enums/roles-permissions.enum';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';

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

  @UseGuards(JwtAuthGuard)
  @Get('configuration')
  async getConfiguration(@CurrentUser() loggedInUser: User) {
    if (!loggedInUser.organization_id)
      throw new NotFoundException('User Organization not found');
    return this.organizationsService.getConfiguration(
      loggedInUser.organization_id,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('configuration')
  @RequirePermissions(Permission.SYSTEM_SETTINGS)
  async updateConfiguration(
    @Body() updateDto: UpdateConfigurationDto,
    @CurrentUser() loggedInUser: User,
  ) {
    if (!loggedInUser.organization_id)
      throw new NotFoundException('User Organization not found');
    return this.organizationsService.updateConfiguration(
      loggedInUser.organization_id,
      updateDto,
    );
  }

  @Get('timezones')
  getTimezones() {
    return this.organizationsService.getTimezoneOptions();
  }

  @Get('languages')
  getLanguages() {
    return this.organizationsService.getLanguageOptions();
  }

  @Get('date-formats')
  getDateFormats() {
    return this.organizationsService.getDateFormats();
  }

  @UseGuards(JwtAuthGuard, ActiveSubscriptionsGuard)
  @Get('patient-licenses')
  getPatientLicenses(@CurrentUser() loggedInUser: User) {
    if (!loggedInUser.organization_id)
      throw new NotFoundException('User Organization not found');
    return this.organizationsService.getOrganizationLicenseUsage(
      loggedInUser.organization_id,
    );
  }
}
