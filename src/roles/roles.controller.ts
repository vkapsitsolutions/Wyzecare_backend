import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

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
  async findAllRoles() {
    return this.rolesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }
}
