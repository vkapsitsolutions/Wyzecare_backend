import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepo: Repository<Organization>,
  ) {}

  async createOrganization(user: User) {
    if (user.organization) {
      return user.organization;
    }
    const newOrg = this.organizationsRepo.create({
      name: `${user.first_name}'s Organization`,
    });

    const savedOrg = await this.organizationsRepo.save(newOrg);

    return savedOrg;
  }

  async getOneOrganization(id: string) {
    const organization = await this.organizationsRepo.findOne({
      where: { id },
      relations: ['subscriptions'],
    });
    return {
      success: true,
      message: 'Organization retrieved successfully',
      data: organization,
    };
  }
}
