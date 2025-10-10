import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  INVITATION_STATUS,
  UserInvitation,
} from './entities/user-invitation.entity';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { randomUUID } from 'crypto';
import { addDays } from 'src/common/helpers/add-days';
import { InviteUsersDto } from './dto/invite-users.dto';
import { EmailService } from 'src/email/email.service';
import { DYNAMIC_TEMPLATES } from 'src/email/templates/email-templates.enum';
import { RolesService } from 'src/roles/roles.service';
import { ConfigService } from '@nestjs/config';
import { USER_STATUS } from './enums/user-status.enum';
import { LOGIN_PROVIDER } from './enums/login.provider.enum';
import * as argon2 from 'argon2';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtTokenService } from 'src/auth/jwt-token.service';
import { UserUtilsService } from './users-utils.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { SubscriptionStatusEnum } from 'src/subscriptions/entities/organization-subscription.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { Role } from 'src/roles/entities/role.entity';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { AuditAction } from 'src/audit-logs/entities/audit-logs.entity';
import { Request } from 'express';

@Injectable()
export class UserInvitationsService {
  constructor(
    @InjectRepository(UserInvitation)
    private invitationsRepository: Repository<UserInvitation>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private readonly emailService: EmailService,

    private readonly rolesService: RolesService,

    private readonly configService: ConfigService,

    private readonly jwtTokenService: JwtTokenService,

    private readonly userUtilsService: UserUtilsService,

    private readonly subscriptionService: SubscriptionsService,

    private readonly auditLogService: AuditLogsService,
  ) {}

  async inviteUsers(dto: InviteUsersDto, currentUser: User) {
    const { invites } = dto;

    if (!currentUser.organization) {
      throw new BadRequestException(
        'Current user does not belong to any organization.',
      );
    }

    const { data: activeSubscription, subscriptionStatus } =
      await this.subscriptionService.getSubscriptionStatus(
        currentUser.organization.id,
      );

    if (subscriptionStatus !== SubscriptionStatusEnum.ACTIVE) {
      throw new BadRequestException(
        'Your organization does not have an active subscription. Please purchase a plan.',
      );
    }

    const { data: subscriptionPlan } = await this.subscriptionService.findOne(
      activeSubscription.subscription_plan_id,
    );

    if (!subscriptionPlan) {
      throw new BadRequestException(
        'Your organization does not have a valid subscription plan.',
      );
    }

    const {
      data: { adminCounts, userCounts },
    } = await this.userUtilsService.getOrganizationUserCounts(
      currentUser.organization.id,
    );

    const orgId = currentUser.organization.id;

    // normalize emails for checks
    const emails = invites.map((i) => i.email.toLowerCase());
    const expiryDays = 7;

    const existingUsers = await this.usersRepository.find({
      where: { email: In(emails) },
      select: ['email'],
      withDeleted: true,
    });

    if (existingUsers.length > 0) {
      const duplicates = existingUsers.map((u) => u.email).join(', ');
      throw new BadRequestException(
        `Users with emails "${duplicates}" already exist.`,
      );
    }

    const pendingInvites = await this.invitationsRepository.find({
      where: {
        email: In(emails),
        organization: { id: orgId },
        status: INVITATION_STATUS.PENDING,
      },
      select: ['email'],
    });

    if (pendingInvites.length > 0) {
      const duplicates = pendingInvites.map((i) => i.email).join(', ');
      throw new BadRequestException(
        `Pending invitations already exist for ${duplicates}.`,
      );
    }

    const roleSlugs = invites.map((i) => i.roleName);
    const uniqueRoleSlugs = Array.from(new Set(roleSlugs));
    const rolesMap = new Map<string, any>();

    for (const slug of uniqueRoleSlugs) {
      const { data: role } = await this.rolesService.findRoleBySlug(slug);
      if (!role) {
        throw new BadRequestException(
          `Role not found for identifier '${slug}'.`,
        );
      }

      rolesMap.set(slug, role);
    }

    // Calculate proposed counts using normalized slugs and a robust admin check
    let newAdmins = 0;
    let newUsers = 0;
    for (const invite of invites) {
      const slug = String(invite.roleName).trim().toLowerCase();
      const role = rolesMap.get(slug) as Role | undefined;
      if (!role) {
        // defensive, should not happen because we validated above
        throw new BadRequestException(
          `Invalid role for invite: ${invite.roleName}`,
        );
      }

      const roleSlug = role.slug;

      const isAdmin = roleSlug === RoleName.ADMINISTRATOR;

      if (isAdmin) newAdmins++;
      else newUsers++;
    }

    if (
      subscriptionPlan &&
      adminCounts + newAdmins > (subscriptionPlan?.max_admins ?? 0)
    ) {
      throw new BadRequestException(
        'Inviting these users would exceed the maximum allowed administrators for your subscription plan.',
      );
    }

    if (userCounts + newUsers > (subscriptionPlan?.max_users ?? 0)) {
      throw new BadRequestException(
        'Inviting these users would exceed the maximum allowed users for your subscription plan.',
      );
    }

    const results: { email: string; status: string }[] = [];

    for (const invite of invites) {
      const token = randomUUID();
      const expiresAt = addDays(new Date(), expiryDays);

      const email = invite.email.toLowerCase();
      const frontend = this.configService
        .getOrThrow<string>('FRONTEND_URL')
        .replace(/\/$/, '');

      const url = new URL(`${frontend}/signup`);
      url.search = new URLSearchParams({ token, email }).toString();

      const link = url.toString(); // fully encoded URL

      const slug = String(invite.roleName).trim().toLowerCase();
      const role = rolesMap.get(slug) as Role;

      const invitation = this.invitationsRepository.create({
        organization: currentUser.organization,
        email: invite.email.toLowerCase(),
        role,
        invitation_token: token,
        invitation_link: link,
        invited_by: currentUser,
        expires_at: expiresAt,
        status: INVITATION_STATUS.PENDING,
      });

      await this.invitationsRepository.save(invitation);

      await this.emailService.sendMail(
        invite.email,
        {
          app_name: 'WyzeCare',
          org_name: currentUser.organization.name,
          inviter_name: `${currentUser.first_name} ${currentUser.last_name}`,
          role: role.title,
          invite_link: link,
          expiry_days: expiryDays,
          expires_at: expiresAt.toISOString(),
          support_email: 'support@wyzecare.com',
          current_year: new Date().getFullYear(),
        },
        DYNAMIC_TEMPLATES.INVITATION_TEMPLATE_KEY,
      );

      results.push({ email: invite.email.toLowerCase(), status: 'invited' });
    }

    return {
      success: true,
      message: 'Invitations sent successfully',
      data: results,
    };
  }

  async acceptInvite(dto: AcceptInvitationDto, req: Request) {
    const { email, firstName, lastName, password, token } = dto;

    const invitation = await this.invitationsRepository.findOne({
      where: {
        invitation_token: token,
        status: INVITATION_STATUS.PENDING,
        email,
      },

      relations: {
        organization: true,
        role: true,
        invited_by: { organization: true },
      },
    });

    const currentDate = new Date();

    if (!invitation || invitation.expires_at < currentDate) {
      throw new BadRequestException('Invalid or expired invitation.');
    }

    if (!invitation.role) {
      throw new BadRequestException('Invitation role is invalid.');
    }

    if (!invitation.invited_by?.organization?.id) {
      throw new BadRequestException('Invalid organization.');
    }

    // --- Validate subscription & counts BEFORE creating the user ---
    const { data: activeSubscription, subscriptionStatus } =
      await this.subscriptionService.getSubscriptionStatus(
        invitation.invited_by?.organization?.id,
      );

    if (subscriptionStatus !== SubscriptionStatusEnum.ACTIVE) {
      throw new BadRequestException(
        'Your organization does not have an active subscription. Please purchase a plan.',
      );
    }

    const { data: subscriptionPlan } = await this.subscriptionService.findOne(
      activeSubscription.subscription_plan_id,
    );

    if (!subscriptionPlan) {
      throw new BadRequestException(
        'Your organization does not have a valid subscription plan.',
      );
    }

    const {
      data: { adminCounts, userCounts },
    } = await this.userUtilsService.getOrganizationUserCounts(
      invitation.organization.id,
    );

    // determine whether the invited role is an admin
    const role = invitation.role;
    const roleSlug = role.slug;
    const isAdminRole = roleSlug === RoleName.ADMINISTRATOR;

    // if accepting would exceed plan caps, block it
    if (isAdminRole && adminCounts + 1 > (subscriptionPlan?.max_admins ?? 0)) {
      throw new BadRequestException(
        'Accepting this invitation would exceed the maximum allowed administrators for your subscription plan.',
      );
    }

    if (!isAdminRole && userCounts + 1 > (subscriptionPlan?.max_users ?? 0)) {
      throw new BadRequestException(
        'Accepting this invitation would exceed the maximum allowed users for your subscription plan.',
      );
    }

    // --- Create user and update invitation in a transaction to reduce race windows ---
    const savedUser: User = await this.usersRepository.manager.transaction(
      async (manager) => {
        // re-check counts inside transaction for better safety
        const {
          data: { adminCounts: adminCountsTx, userCounts: userCountsTx },
        } = await this.userUtilsService.getOrganizationUserCounts(
          invitation.organization.id,
        );

        if (
          isAdminRole &&
          adminCountsTx + 1 > (subscriptionPlan?.max_admins ?? 0)
        ) {
          throw new BadRequestException(
            'Accepting this invitation would exceed the maximum allowed administrators for your subscription plan.',
          );
        }

        if (
          !isAdminRole &&
          userCountsTx + 1 > (subscriptionPlan?.max_users ?? 0)
        ) {
          throw new BadRequestException(
            'Accepting this invitation would exceed the maximum allowed users for your subscription plan.',
          );
        }

        // Hash password (use bcrypt or argon2)
        const hashedPassword = await argon2.hash(password);

        // create user entity instance
        const userToCreate = this.usersRepository.create({
          organization: invitation.organization,
          first_name: firstName,
          last_name: lastName,
          email: invitation.email.toLowerCase(),
          password: hashedPassword,
          email_verified: true, // Since invited, verify email
          status: USER_STATUS.ACTIVE,
          login_provider: LOGIN_PROVIDER.LOCAL,
          invitation_accepted_at: currentDate,
          role: invitation.role,
          created_by: invitation.invited_by,
        });

        // Save user using the transaction manager
        const userRepository = manager.getRepository(
          this.usersRepository.metadata.target,
        );
        const createdUser = await userRepository.save(userToCreate);

        // update invitation inside same transaction
        invitation.accepted_at = currentDate;
        invitation.status = INVITATION_STATUS.ACCEPTED;
        const invitationRepository = manager.getRepository(
          this.invitationsRepository.metadata.target,
        );
        await invitationRepository.save(invitation);

        // return the created user so the outer scope gets a guaranteed-assigned user
        return createdUser as User;
      },
    );

    if (!savedUser) {
      throw new InternalServerErrorException('Failed to create user.');
    }

    await this.auditLogService.createLog({
      organization_id: savedUser.organization_id,
      actor_id: invitation?.invited_by?.id,
      role: RoleName.ADMINISTRATOR,
      action: AuditAction.USER_CREATED,
      module_id: savedUser.id,
      module_name: 'User',
      message: `Created new user account for ${savedUser.fullName}`,
      payload: { after: savedUser }, // Snapshot of created data
      ip_address: req.ip,
      device_info: req.headers['user-agent'],
    });

    // --- Tokens & refresh token ---
    const { accessToken, refreshToken } =
      this.jwtTokenService.generateTokens(savedUser);

    await this.userUtilsService.setCurrentRefreshToken(
      savedUser.id,
      refreshToken,
    );
    return {
      success: true,
      message: 'Invitation accepted successfully',
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
