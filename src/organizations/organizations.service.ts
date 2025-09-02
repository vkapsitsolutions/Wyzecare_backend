import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import {
  DateFormatEnum,
  LanguageEnum,
  TimezoneEnum,
} from './enums/organization.enum';
import { timezoneLabelMap } from 'src/common/helpers/time-zone-mapper';

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

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      success: true,
      message: 'Organization retrieved successfully',
      data: organization,
    };
  }

  async getConfiguration(id: string) {
    const organization = await this.organizationsRepo.findOneBy({ id });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return {
      success: true,
      message: 'Configuration fetched',
      data: {
        timezone: organization.timezone,
        date_format: organization.date_format,
        language: organization.language,
      },
    };
  }

  async updateConfiguration(id: string, updateDto: UpdateConfigurationDto) {
    const organization = await this.organizationsRepo.findOneBy({ id });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    Object.assign(organization, updateDto);
    const updatedOrg = await this.organizationsRepo.save(organization);
    return {
      success: true,
      message: 'Configuration updated',
      data: {
        timezone: updatedOrg.timezone,
        date_format: updatedOrg.date_format,
        language: updatedOrg.language,
      },
    };
  }

  getTimezoneOptions() {
    return Object.values(TimezoneEnum).map((value) => ({
      value,
      label: timezoneLabelMap[value],
    }));
  }

  getDateFormats() {
    return Object.values(DateFormatEnum);
  }

  getLanguageOptions() {
    return Object.values(LanguageEnum);
  }
}
