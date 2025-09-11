import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { In, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { AssignPatientsDto } from './dto/assign-patients.dto';
import { UploadsService } from 'src/uploads/uploads.service';

@Injectable()
export class PatientAccessService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly uploadsService: UploadsService,
  ) {}

  private async getUserWithAccessiblePatients(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        role: true,
        accessiblePatients: { contact: true },
      },
    });
    if (!user) {
      throw new NotFoundException(`User not found with id ${user}`);
    }

    return user;
  }

  async listUsersWithAccessCounts(loggedInUser: User) {
    const users = await this.userRepository.find({
      where: { organization_id: loggedInUser.organization_id },

      relations: { role: true },
    });

    const result = await Promise.all(
      users.map(async (user) => {
        const { count } = await this.getAccessCountForUser(user.id);
        if (user.photo) {
          const photo = await this.uploadsService.getFile(user.photo);

          if (photo) user.photo = photo;
        }
        return {
          user,
          count,
        };
      }),
    );

    return {
      success: true,
      result,
    };
  }

  async getAccessiblePatients(userId: string) {
    const user = await this.getUserWithAccessiblePatients(userId);
    if (user.role?.slug === RoleName.ADMINISTRATOR) {
      const patients = await this.patientRepository.find({
        where: { organization_id: user.organization_id },
        relations: { contact: true },
      });

      return { success: true, patients };
    }

    return {
      success: true,
      patients: user.accessiblePatients,
    };
  }

  async canAccessAndEditPatient(
    userId: string,
    patient: Patient,
  ): Promise<boolean> {
    const user = await this.getUserWithAccessiblePatients(userId);
    const hasAccess =
      user.role?.slug === RoleName.ADMINISTRATOR ||
      user.accessiblePatients?.some((p) => p.id === patient.id);
    if (!hasAccess) return false;
    return user.role?.slug !== RoleName.VIEWER;
  }

  async assignPatientsToUser(
    targetUserId: string,
    assignPatientsDto: AssignPatientsDto,
  ) {
    const { patientIds = [] } = assignPatientsDto;

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: { accessiblePatients: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User not found with id ${targetUserId}`);
    }

    if (targetUser.role?.slug === RoleName.ADMINISTRATOR) {
      // administrator already has full access; nothing to change
      return {
        success: true,
        message: 'Patients assigned to user',
      };
    }

    // If no patientIds provided, clear all accessible patients
    let patients: Patient[] = [];
    if (Array.isArray(patientIds) && patientIds.length > 0) {
      patients = await this.patientRepository.find({
        where: { id: In(patientIds) },
      });
    }

    // Replace the user's accessiblePatients with exactly the patients found.
    // This will remove any old relations that are not in `patients`.
    targetUser.accessiblePatients = patients;
    await this.userRepository.save(targetUser);

    return {
      success: true,
      message: 'Patients assigned to user',
    };
  }

  async getAccessCountForPatient(patientId: string) {
    const count = await this.userRepository.count({
      where: {
        accessiblePatients: { id: patientId },
      },
    });

    return { success: true, count };
  }

  async getAccessCountForUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
      select: ['id', 'organization_id', 'role'],
    });
    if (!user) {
      throw new NotFoundException(`User not found with id ${userId}`);
    }

    let count: number;
    if (user.role?.slug === RoleName.ADMINISTRATOR) {
      count = await this.patientRepository.count({
        where: { organization_id: user.organization_id },
      });
    } else {
      count = await this.patientRepository.count({
        where: {
          usersWithAccess: { id: userId },
        },
      });
    }

    return {
      success: true,
      count,
    };
  }
}
