import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserUtilsService } from './users-utils.service';
import { VerificationsModule } from 'src/verifications/verifications.module';
import { AuthModule } from 'src/auth/auth.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { UserInvitationsService } from './user-invitations.service';
import { UserInvitation } from './entities/user-invitation.entity';
import { UserInvitationsController } from './user-invitations.controller';
import { EmailModule } from 'src/email/email.module';
import { RolesModule } from 'src/roles/roles.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserInvitation]),
    VerificationsModule,
    AuthModule,
    UploadsModule,
    EmailModule,
    RolesModule,
    SubscriptionsModule,
  ],
  controllers: [UsersController, UserInvitationsController],
  providers: [UsersService, UserUtilsService, UserInvitationsService],
  exports: [UserUtilsService],
})
export class UsersModule {}
