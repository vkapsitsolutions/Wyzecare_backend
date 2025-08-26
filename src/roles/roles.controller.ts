import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  getSystemPermissions() {
    return this.rolesService.getSystemPermissions();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAllRoles(@CurrentUser() loggedInUser: User) {
    const organizationId = loggedInUser.organization?.id;

    return this.rolesService.findAll(organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }
}
