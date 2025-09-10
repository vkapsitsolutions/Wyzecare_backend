import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationsController } from './organizations.controller';
import { CallScriptsModule } from 'src/call-scripts/call-scripts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), CallScriptsModule],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
