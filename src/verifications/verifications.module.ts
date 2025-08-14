import { forwardRef, Module } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { VerificationsController } from './verifications.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Verification } from './entitiies/verification.entity';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Verification]),
    forwardRef(() => UsersModule),
    EmailModule,
  ],
  providers: [VerificationsService],
  controllers: [VerificationsController],
  exports: [VerificationsService],
})
export class VerificationsModule {}
