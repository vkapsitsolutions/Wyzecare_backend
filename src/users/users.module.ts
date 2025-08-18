import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserUtilsService } from './users-utils.service';
import { VerificationsModule } from 'src/verifications/verifications.module';
import { AuthModule } from 'src/auth/auth.module';
import { UploadsModule } from 'src/uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    VerificationsModule,
    AuthModule,
    UploadsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserUtilsService],
  exports: [UserUtilsService],
})
export class UsersModule {}
