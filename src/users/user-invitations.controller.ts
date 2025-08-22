import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserInvitationsService } from './user-invitations.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { InviteUsersDto } from './dto/invite-users.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequirePermissions } from 'src/roles/decorators/permissions.decorator';
import { Permission } from 'src/roles/enums/roles-permissions.enum';

@Controller('user-invitations')
export class UserInvitationsController {
  constructor(
    private readonly userInvitationsService: UserInvitationsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.INVITE_USERS)
  @Post('invite')
  async inviteUsers(
    @Body() dto: InviteUsersDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.userInvitationsService.inviteUsers(dto, currentUser);
  }

  @Post('accept')
  async acceptInvite(@Body() dto: AcceptInvitationDto) {
    return this.userInvitationsService.acceptInvite(dto);
  }
}
