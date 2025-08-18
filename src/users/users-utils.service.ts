import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as argon2 from 'argon2';
import { UploadsService } from 'src/uploads/uploads.service';

@Injectable()
export class UserUtilsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly uploadsService: UploadsService,
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

    if (user) {
      const image = await this.uploadsService.getFile(user.photo);
      if (image) user.photo = image;
    }

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
}
