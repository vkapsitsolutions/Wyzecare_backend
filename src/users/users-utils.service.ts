import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as argon2 from 'argon2';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Role } from 'src/roles/entities/role.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';

@Injectable()
export class UserUtilsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async checkEmailExists(email: string): Promise<boolean> {
    const userExists = await this.userRepository.exists({
      where: { email },

      withDeleted: true,
    });

    return userExists;
  }

  async findById(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        organization: true,
        role: true,
      },
    });

    return user;
  }

  async findByIdForRefreshToken(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { refresh_token_hash: true, id: true, password: true },
    });

    return user;
  }

  async findByEmailForInternal(email: string): Promise<User | null> {
    return (
      this.userRepository
        .createQueryBuilder('user')
        .addSelect(['user.password', 'user.refresh_token_hash'])
        // .leftJoinAndSelect('user.role', 'role')
        // .leftJoinAndSelect('user.organization', 'organization')
        .where('user.email = :email', { email })
        .getOne()
    );
  }

  async setCurrentRefreshToken(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) return;

    user.refresh_token_hash = hash;

    await this.userRepository.save(user);
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.findByIdForRefreshToken(userId);

    if (!user || !user.refresh_token_hash) {
      return false;
    }

    const valid = await argon2.verify(user.refresh_token_hash, refreshToken);

    return valid;
  }

  async clearCurrentRefreshToken(user: User): Promise<void> {
    user.refresh_token_hash = '';
    await this.userRepository.save(user);
  }

  async setLastLogin(user: User) {
    user.last_login = new Date();

    await this.userRepository.save(user);
  }

  async assignOrganization(currentUser: User, organization: Organization) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: { organization: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.organization) return user.organization;

    user.organization = organization;

    return await this.userRepository.save(user);
  }

  async assignRole(currentUser: User, role: Role) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: { role: true },
    });

    if (!user) throw new NotFoundException('User not found');

    user.role = role;

    return await this.userRepository.save(user);
  }

  async getOrganizationUserCounts(organizationId: string) {
    const adminCounts = await this.userRepository.count({
      where: {
        organization: { id: organizationId },
        role: { slug: RoleName.ADMINISTRATOR },
      },
      relations: { organization: true, role: true },
    });

    const userCounts = await this.userRepository.count({
      where: {
        organization: { id: organizationId },
        role: { slug: Not(RoleName.ADMINISTRATOR) },
      },
      relations: { organization: true, role: true },
    });

    return {
      success: true,
      message: 'Organization user counts retrieved successfully',
      data: {
        adminCounts,
        userCounts,
      },
    };
  }
}
