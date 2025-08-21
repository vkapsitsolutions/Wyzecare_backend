import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
