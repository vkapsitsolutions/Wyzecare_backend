import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageValidator } from 'src/common/validators/image.validator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-user.dto';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission } from 'src/roles/enums/roles-permissions.enum';
import { ListOrgUsersDto } from './dto/list-org-users.dto';
import { UserUtilsService } from './users-utils.service';
import { EditUserDto } from './dto/edit-user.dto';
import { ActiveSubscriptionsGuard } from 'src/subscriptions/guards/active-subscriptions.guard';
import { Request } from 'express';
import { SelectUserTypeDto } from './dto/select-type.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userUtilsService: UserUtilsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('select-type')
  selectType(
    @CurrentUser() user: User,
    @Body() selectUserTypeDto: SelectUserTypeDto,
  ) {
    return this.usersService.selectUserType(user, selectUserTypeDto.userType);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('photo', {
      fileFilter: imageValidator,
      limits: {
        fileSize: 1_000_000, // 1 MB
      },
    }),
  )
  updateProfile(
    @Body() body: UpdateProfileDto,
    @CurrentUser() user: User,
    @UploadedFile()
    file: Express.Multer.File | undefined,
  ) {
    return this.usersService.updateUser(user, body, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Get('organization-users')
  listOrganizationUsers(
    @CurrentUser() user: User,
    @Query() query: ListOrgUsersDto,
  ) {
    if (!user.organization) {
      throw new BadRequestException('User does not belong to an organization');
    }
    return this.usersService.listOrganizationUsers(user.organization.id, query);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, ActiveSubscriptionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Get('organization-users/:id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Get('get-counts')
  getCounts(@CurrentUser() user: User) {
    if (!user.organization) {
      throw new NotFoundException('User does not belong to an organization');
    }
    return this.userUtilsService.getOrganizationUserCounts(
      user.organization.id,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Post('toggle-user-status/:id')
  toggleUserStatus(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser() loggedInUser: User,
    @Req() req: Request,
  ) {
    if (!loggedInUser.organization) return;
    return this.usersService.toggleUserStatus(
      userId,
      loggedInUser.organization.id,
      loggedInUser,
      req,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Patch('edit-user/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) userToEditId: string,
    @Body() updateUserDto: EditUserDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    if (!user.organization) return;
    return this.usersService.editUser(
      updateUserDto,
      userToEditId,
      user.organization.id,
      user,
      req,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @Delete('delete/:id')
  deleteUser(
    @Param('id', ParseUUIDPipe) userToDeleteId: string,
    @CurrentUser() loggedInUser: User,
    @Req() req: Request,
  ) {
    if (!loggedInUser.organization) return;
    return this.usersService.deleteUser(
      userToDeleteId,
      loggedInUser.organization.id,
      loggedInUser,
      req,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('temp/deleted-users')
  getDeletedUsers() {
    return this.userUtilsService.getDeletedUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('temp/restore/:id')
  restoreDeletedUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userUtilsService.restoreDeletedUser(id);
  }
}
