import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Patient } from 'src/patients/entities/patient.entity'; // Adjust path as needed
import { Repository, DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Request } from 'express';

@Injectable()
export class PatientAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectDataSource() // Inject DataSource instead of Connection
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const accessType = this.reflector.get<string>(
      'patientAccess',
      context.getHandler(),
    );
    // If no accessType defined, assume 'read'
    const requiredAccess = accessType || 'read';

    const request: Request = context.switchToHttp().getRequest();
    const user: User = request.user as User;
    if (!user || !user.id || !user.role?.slug) {
      throw new ForbiddenException('User not authenticated or role missing');
    }

    const patientId: string = request.params.patientId;
    if (!patientId) {
      throw new ForbiddenException(
        'Patient ID not provided in route parameters',
      );
    }

    // Fetch patient with minimal data
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
      select: ['id', 'organization_id'],
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found with ID ${patientId}`);
    }

    let hasAccess = false;

    // if (user.role.slug === RoleName.SUPER_ADMIN) {
    //   hasAccess = true; // May needed in future requirements
    // } else
    if (user.role.slug === RoleName.ADMINISTRATOR) {
      hasAccess = patient.organization_id === user.organization_id;
    } else {
      // Check if assigned via join table
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      try {
        const count = await queryRunner.manager
          .createQueryBuilder()
          .select('1')
          .from('user_patient_access', 'upa')
          .where('upa.patient_id = :patientId', { patientId })
          .andWhere('upa.user_id = :userId', { userId: user.id })
          .getCount();
        hasAccess = count > 0;
      } finally {
        await queryRunner.release();
      }
    }

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this patient');
    }

    if (requiredAccess === 'write') {
      const canEdit = user.role.slug !== RoleName.VIEWER;
      if (!canEdit) {
        throw new ForbiddenException(
          'You do not have permission to edit this patient',
        );
      }
    }

    return true;
  }
}
