import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { SubscriptionPlan } from 'src/subscriptions/entities/subcription-plans.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, User, SubscriptionPlan])],
  providers: [SeederService],
})
export class SeederModule {}
