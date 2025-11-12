import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
  Post,
  Body,
  ParseFloatPipe,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/roles/guards/roles.guard';
import { RequiredRoles } from 'src/roles/decorators/roles.decorator';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { ListOrganizationsDto } from 'src/organizations/dto/list-organizations.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequiredRoles(RoleName.SUPER_ADMIN)
  @Get('list-organizations')
  listOrganizations(@Query() listOrganizationsDto: ListOrganizationsDto) {
    return this.superAdminService.listAllOrganizations(listOrganizationsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequiredRoles(RoleName.SUPER_ADMIN)
  @Get('organizations/:id')
  getOneOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.superAdminService.getOneOrganization(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequiredRoles(RoleName.SUPER_ADMIN)
  @Post('organizations/:id/assign-price')
  setCustomPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('customPrice', ParseFloatPipe) customPrice: number,
    @CurrentUser() loggedInAdmin: User,
  ) {
    return this.superAdminService.setCustomPrice(
      id,
      customPrice,
      loggedInAdmin,
    );
  }
}
