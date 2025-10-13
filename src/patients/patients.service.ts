import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient, PatientStatusEnum } from './entities/patient.entity';
import { Brackets, In, Repository } from 'typeorm';
import { CreatePatientDto } from './dto/create-patient.dto';
import { User } from 'src/users/entities/user.entity';
import { PatientContactDto } from './dto/patient-contacts.dto';
import { PatientContact } from './entities/patient-contact.entity';
import { PatientEmergencyContact } from './entities/patient-emergency-contact.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientsQuery } from './dto/get-patients-query.dto';
import { MedicalInfoDto } from './dto/medical-info.dto';
import { PatientMedicalInfo } from './entities/patient-medical-info.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { PatientAccessService } from './patient-access.service';
import { CallScriptUtilsService } from 'src/call-scripts/call-scripts-utils.service';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditPayload,
} from 'src/audit-logs/entities/audit-logs.entity';
import { Request } from 'express';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,

    private readonly patientAccessService: PatientAccessService,

    @Inject(forwardRef(() => CallScriptUtilsService))
    private readonly callScriptUtilsService: CallScriptUtilsService,

    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findByPatientIdNumber(patientIdNumber: string) {
    return this.patientRepository.findOne({
      where: { patientId: patientIdNumber },
    });
  }

  async findById(id: string, loggedInUser?: User, req?: Request) {
    const patient = await this.patientRepository.findOne({
      where: { id },
      relations: {
        createdBy: true,
        updatedBy: true,
        contact: true,
        emergencyContacts: true,
        medicalInfo: true,
        assignedCallScripts: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    const sections: string[] = [];

    if (patient) {
      sections.push('Personal Information');
    }

    if (patient.contact) {
      sections.push('Contact information');
    }

    if (patient.emergencyContacts) {
      sections.push('Emergency contacts');
    }

    if (patient.medicalInfo) {
      sections.push('Medical Information');
    }

    if (patient.callSchedules) {
      sections.push('Call Schedules');
    }

    if (patient.assignedCallScripts.length) {
      sections.push('Assigned scripts');
    }

    if (loggedInUser && req) {
      await this.auditLogsService.createLog({
        organization_id: loggedInUser.organization_id,
        actor_id: loggedInUser.id,
        role: loggedInUser.role?.slug,
        action: AuditAction.PATIENT_VIEW,
        module_id: patient.id,
        module_name: 'Patient',
        message: `Viewed patient ${patient.fullName} (ID: ${patient.id})`,
        payload: { sections }, // Accessed sections for detailed auditing
        ip_address: req.ip,
        device_info: req.headers['user-agent'],
      });
    }

    return {
      success: true,
      message: 'Patient fetched successfully',
      patient,
    };
  }

  async listAllPatients(
    organizationId: string,
    getPatientsQuery: GetPatientsQuery,
    loggedInUser: User,
  ) {
    const { status, page, limit, keyword } = getPatientsQuery ?? {};

    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

    const qb = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.callSchedules', 'callSchedule')
      .leftJoinAndSelect('callSchedule.script', 'script')
      .select([
        'patient.id',
        'patient.patientId',
        'patient.firstName',
        'patient.lastName',
        'patient.preferredName',
        'patient.gender',
        'patient.dateOfBirth',
        'patient.roomNumber',
        'patient.floor',
        'patient.current_wellness',
        'patient.status',
        'patient.notes',
        'patient.careTeam',
        'patient.language_preference',
        'patient.created_at',
        'callSchedule.id',
        'callSchedule.frequency',
        'callSchedule.agent_gender',
        'callSchedule.timezone',
        'callSchedule.time_window_start',
        'callSchedule.time_window_end',
        'callSchedule.instructions',
        'callSchedule.status',
        'callSchedule.last_completed',
        'callSchedule.next_scheduled_at',
        'script.title',
      ])
      .where('patient.organization_id = :orgId', { orgId: organizationId });

    if (status) {
      qb.andWhere('patient.status = :status', { status });
    }

    const rawKeyword = keyword?.toString().trim();
    if (rawKeyword && rawKeyword.length > 0) {
      const tokens = rawKeyword.split(/\s+/).slice(0, 5); // limit tokens to 5 for safety

      tokens.forEach((token, idx) => {
        const paramName = `kw${idx}`;
        const likeValue = `%${token}%`;

        qb.andWhere(
          new Brackets((qbInner) => {
            qbInner
              .where(`patient.first_name ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`patient.last_name ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`patient.patient_id ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`patient.preferred_name ILIKE :${paramName}`, {
                [paramName]: likeValue,
              })
              .orWhere(`patient.notes ILIKE :${paramName}`, {
                [paramName]: likeValue,
              });
          }),
        );
      });
    }

    // --- ROLE / ACCESS DECISION ---
    // Robust role detection:
    const roleSlug = loggedInUser?.role?.slug || null;

    const isAdmin = roleSlug === RoleName.ADMINISTRATOR;

    if (!isAdmin) {
      // non-admins only see patients they have access to (via user_patient_access)
      qb.andWhere(
        `EXISTS (
      SELECT 1 FROM user_patient_access upa
      WHERE upa.patient_id = patient.id
        AND upa.user_id = :userId
    )`,
        { userId: loggedInUser.id },
      );
    }

    qb.orderBy('patient.created_at', 'DESC')
      .skip((pageNum - 1) * perPage)
      .take(perPage);

    const [patients, total] = await qb.getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return {
      success: true,
      message: 'Patients fetched',
      total,
      page: pageNum,
      limit: perPage,
      totalPages,
      data: patients,
    };
  }

  async upsertPatient(
    dto: CreatePatientDto | UpdatePatientDto,
    organizationId: string,
    loggedInUser: User,
    req: Request,
  ) {
    // extract fields (works for both Create & Update DTO shapes)
    const {
      firstName,
      lastName,
      patientId,
      dateOfBirth,
      gender,
      preferredName,
      careTeam,
      floor,
      roomNumber,
      notes,
      id, // only when update
    } = dto;

    // 1) If id provided -> update flow
    if (id) {
      const patient = await this.patientRepository.findOne({ where: { id } });
      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      const beforeUpdate = { ...patient };

      if (patient.organization_id !== organizationId) {
        throw new ForbiddenException(
          'You do not have permission to update this patient',
        );
      }

      const canEditPatient =
        await this.patientAccessService.canAccessAndEditPatient(
          loggedInUser.id,
          patient,
        );

      if (!canEditPatient) {
        throw new ForbiddenException('You cannot edit this patient');
      }

      // If incoming patientId is different, ensure uniqueness
      if (patientId && patient.patientId !== patientId) {
        const existingPatient = await this.findByPatientIdNumber(patientId);
        if (existingPatient && existingPatient.id !== patient.id) {
          throw new ConflictException(
            `Patient with ID ${patientId} already exists`,
          );
        }
      }

      // Apply only provided fields
      if (firstName !== undefined) patient.firstName = firstName;
      if (lastName !== undefined) patient.lastName = lastName;
      if (patientId === '') {
        patient.patientId = null;
      } else if (patientId !== undefined) {
        patient.patientId = patientId;
      } else {
        // patient.patientId = patient.patientId;
      }
      if (dateOfBirth !== undefined) patient.dateOfBirth = dateOfBirth;
      if (gender !== undefined) patient.gender = gender;
      if (preferredName !== undefined) patient.preferredName = preferredName;
      if (careTeam !== undefined) patient.careTeam = careTeam;
      if (floor !== undefined) patient.floor = floor;
      if (roomNumber !== undefined) patient.roomNumber = roomNumber;
      if (notes !== undefined) patient.notes = notes;

      patient.updated_by_id = loggedInUser.id;

      const updatedPatient = await this.patientRepository.save(patient);

      const payload: AuditPayload = {
        before: beforeUpdate,
        after: updatedPatient,
      };

      await this.auditLogsService.createLog({
        organization_id: loggedInUser.organization_id,
        actor_id: loggedInUser.id,
        role: loggedInUser.role?.slug,
        action: AuditAction.PATIENT_EDIT,
        module_id: patient.id,
        module_name: 'Patient',
        message: `Edited patient details. Patient name ${patient.fullName}, Patient id: ${patient.id}`,
        payload,
        ip_address: req.ip,
        device_info: req.headers['user-agent'],
      });

      return {
        success: true,
        message: 'Patient updated successfully',
        patient: updatedPatient,
      };
    }

    // creation logic below
    if (
      loggedInUser.role &&
      loggedInUser.role.slug !== RoleName.ADMINISTRATOR
    ) {
      throw new ForbiddenException('Only admins can create a new patient');
    }

    if (patientId) {
      const existingPatient = await this.findByPatientIdNumber(patientId);
      if (existingPatient) {
        throw new ConflictException(
          `Patient with ID ${patientId} already exists`,
        );
      }
    }

    const newPatient = this.patientRepository.create({
      organization_id: organizationId,
      firstName,
      lastName,
      patientId: patientId ? patientId : null,
      preferredName,
      dateOfBirth,
      gender,
      careTeam,
      notes,
      floor,
      roomNumber,
      created_by_id: loggedInUser.id,
    });

    const savedPatient = await this.patientRepository.save(newPatient);

    await this.callScriptUtilsService.assignDefaultCallScriptsToPatient(
      savedPatient,
    );

    await this.auditLogsService.createLog({
      organization_id: loggedInUser.organization_id,
      actor_id: loggedInUser.id,
      role: loggedInUser.role?.slug,
      action: AuditAction.PATIENT_CREATED,
      module_id: newPatient.id,
      module_name: 'Patient',
      message: `Created new patient. Patient name ${savedPatient.fullName}, Patient id: ${savedPatient.id}`,
      payload: { after: savedPatient }, // Added info
      ip_address: req.ip,
      device_info: req.headers['user-agent'],
    });

    return {
      success: true,
      message: 'Patient created successfully',
      patient: savedPatient,
    };
  }

  async updatePatientContactAndEmergency(
    patientId: string,
    loggedInUser: User,
    patientContactData: PatientContactDto,
    organizationId: string,
    req: Request,
  ) {
    // 1) ensure patient exists
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    const before = {
      contactInfo: { ...patient.contact },
      emergencyContacts: { ...patient.emergencyContacts },
    };

    if (patient.organization_id !== organizationId) {
      throw new ForbiddenException('Patient belongs to different organization');
    }

    // Use a transaction so patient + contact + emergency contacts update together
    const result = await this.patientRepository.manager.transaction(
      async (manager) => {
        const contactRepo = manager.getRepository(PatientContact);
        const emergencyRepo = manager.getRepository(PatientEmergencyContact);
        const patientRepo = manager.getRepository(Patient);

        // Common payload with defined fields only, excluding patient_id
        const commonContactPayload = this.stripUndefined({
          primary_phone: patientContactData.primary_phone,
          alternate_phone: patientContactData.alternate_phone,
          email: patientContactData.email,
          street_address: patientContactData.street_address,
          city: patientContactData.city,
          state: patientContactData.state,
          zip_code: patientContactData.zip_code,
          country: patientContactData.country,
        });

        // upsert PatientContact (one-to-one)
        let savedContact: PatientContact;
        const existingContact = await contactRepo.findOne({
          where: { patient_id: patientId },
        });

        // Determine the new primary phone after update/create
        let newPrimaryPhone: string | null = null;
        if (existingContact) {
          newPrimaryPhone =
            'primary_phone' in patientContactData
              ? patientContactData.primary_phone
              : existingContact.primary_phone;
        } else {
          newPrimaryPhone = patientContactData.primary_phone ?? null;
        }

        // Check for duplicate primary phone within the organization if applicable
        if (newPrimaryPhone && newPrimaryPhone.trim() !== '') {
          const conflicting = await contactRepo
            .createQueryBuilder('contact')
            .innerJoin('contact.patient', 'patient')
            .where('contact.primary_phone = :phone', { phone: newPrimaryPhone })
            .andWhere('patient.organization_id = :orgId', {
              orgId: organizationId,
            })
            .andWhere('contact.patient_id != :patId', { patId: patientId })
            .getCount();

          if (conflicting > 0) {
            throw new BadRequestException(
              `Primary phone ${newPrimaryPhone} is already in use by another patient in this organization`,
            );
          }
        }

        if (existingContact) {
          // update only provided fields
          await contactRepo.update(
            { id: existingContact.id },
            commonContactPayload,
          );
          savedContact = await contactRepo.findOneOrFail({
            where: { id: existingContact.id },
          });
        } else {
          const createPayload = {
            ...commonContactPayload,
            patient_id: patientId,
          };
          const created = contactRepo.create(createPayload);
          savedContact = await contactRepo.save(created);
        }

        // emergency contacts handling: upsert by id; delete any existing not present in incoming list
        let savedEmergencies: PatientEmergencyContact[] = [];

        if (Array.isArray(patientContactData.emergencyContacts)) {
          const incoming = patientContactData.emergencyContacts;

          // Validate only one primary
          const primaryCount = incoming.reduce(
            (c, ec) => c + (ec.is_primary ? 1 : 0),
            0,
          );
          if (primaryCount > 1) {
            throw new BadRequestException(
              'Only one emergency contact can be marked as primary',
            );
          }

          const existingEmergencies = await emergencyRepo.find({
            where: { patient_id: patientId },
          });

          const existingById = new Map<string, PatientEmergencyContact>();
          existingEmergencies.forEach((e) => existingById.set(e.id, e));

          // Collect ids that will be kept (incoming ids)
          const incomingIdsSet = new Set<string>();
          const toSave: Partial<PatientEmergencyContact>[] = [];

          for (const ec of incoming) {
            // prepare payload with only defined fields, excluding patient_id for common
            const commonEcPayload = this.stripUndefined({
              name: ec.name,
              relationship: ec.relationship,
              phone: ec.phone,
              alternate_phone: ec.alternate_phone,
              email: ec.email,
              is_primary: ec.is_primary ? true : false,
            });

            if (ec.id) {
              incomingIdsSet.add(ec.id);
              const existing = existingById.get(ec.id);
              if (existing) {
                // merge existing with payload (so unspecified DB fields are preserved)
                const merged = emergencyRepo.create({
                  ...existing,
                  ...commonEcPayload,
                } as Partial<PatientEmergencyContact>);
                toSave.push(merged);
              } else {
                // provided id not found -> create new
                const createEcPayload = {
                  ...commonEcPayload,
                  patient_id: patientId,
                };
                const created = emergencyRepo.create(createEcPayload);
                toSave.push(created);
              }
            } else {
              // new contact (no id)
              const createEcPayload = {
                ...commonEcPayload,
                patient_id: patientId,
              };
              const created = emergencyRepo.create(createEcPayload);
              toSave.push(created);
            }
          }

          // Delete existing emergency contacts that are not in incoming ids (only those that had ids)
          const existingIds = existingEmergencies.map((e) => e.id);
          const idsToDelete = existingIds.filter(
            (id) => !incomingIdsSet.has(id),
          );

          if (idsToDelete.length > 0) {
            await emergencyRepo.delete(idsToDelete);
          }

          // Save (insert new and update existing)
          if (toSave.length > 0) {
            savedEmergencies = await emergencyRepo.save(toSave);
          } else {
            // No incoming entries to save — fetch remaining existing ones (if any)
            savedEmergencies = await emergencyRepo.find({
              where: { patient_id: patientId },
            });
          }
        } else {
          // emergencyContacts not provided — keep existing
          savedEmergencies = await emergencyRepo.find({
            where: { patient_id: patientId },
          });
        }

        // updated by
        if (loggedInUser?.id) {
          await patientRepo.update(
            { id: patientId },
            {
              updated_by_id: loggedInUser.id,
            },
          );
        }

        const payload: AuditPayload = {
          before: before,
          after: {
            contactInfo: result.contact,
            emergencyContacts: result.emergencyContacts,
          },
        };

        await this.auditLogsService.createLog({
          organization_id: loggedInUser.organization_id,
          actor_id: loggedInUser.id,
          role: loggedInUser.role?.slug,
          action: AuditAction.PATIENT_EDIT,
          module_id: patient.id,
          module_name: 'Patient',
          message: `Edited patient contact and emergency contact. Patient name ${patient.fullName}, Patient id: ${patient.id}`,
          payload,
          ip_address: req.ip,
          device_info: req.headers['user-agent'],
        });

        return {
          success: true,
          message:
            'Patient contact and emergency contacts updated successfully',
          contact: savedContact,
          emergencyContacts: savedEmergencies,
        };
      },
    );

    return result;
  }

  async addOrUpdateMedicalInfo(
    patientId: string,
    organizationId: string,
    medicalInfoDto: MedicalInfoDto,
    loggedInUser: User,
    req: Request,
  ) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (patient.organization_id !== organizationId) {
      throw new ForbiddenException('Patient belongs to different organization');
    }

    const before = { ...patient.medicalInfo };

    const result = await this.patientRepository.manager.transaction(
      async (manager) => {
        const medicalInfoRepo = manager.getRepository(PatientMedicalInfo);
        const patientRepo = manager.getRepository(Patient);

        // Common payload with defined fields only
        const commonPayload = this.stripUndefined({
          conditions: medicalInfoDto.conditions,
          medications: medicalInfoDto.medications,
          allergies: medicalInfoDto.allergies,
          primary_physician: medicalInfoDto.primary_physician,
        });

        // upsert Medical Info
        let savedMedicalInfo: PatientMedicalInfo;
        const existingMedicalInfo = await medicalInfoRepo.findOne({
          where: { patient_id: patientId },
        });

        if (existingMedicalInfo) {
          // update only provided fields
          await medicalInfoRepo.update(
            { id: existingMedicalInfo.id },
            commonPayload,
          );
          savedMedicalInfo = await medicalInfoRepo.findOneOrFail({
            where: { id: existingMedicalInfo.id },
          });
        } else {
          const createPayload = {
            ...commonPayload,
            patient_id: patientId,
          };
          const created = medicalInfoRepo.create(createPayload);
          savedMedicalInfo = await medicalInfoRepo.save(created);
        }

        // updated by
        if (loggedInUser?.id) {
          await patientRepo.update(
            { id: patientId },
            {
              updated_by_id: loggedInUser.id,
            },
          );
        }

        return {
          success: true,
          message: 'Patient medical information updated successfully',
          medicalInfo: savedMedicalInfo,
        };
      },
    );

    const payload: AuditPayload = {
      before: before,
      after: patient.medicalInfo,
    };

    await this.auditLogsService.createLog({
      organization_id: loggedInUser.organization_id,
      actor_id: loggedInUser.id,
      role: loggedInUser.role?.slug,
      action: AuditAction.PATIENT_EDIT,
      module_id: patient.id,
      module_name: 'Patient',
      message: `Edited patient medical information. Patient name ${patient.fullName}, Patient id: ${patient.id}`,
      payload,
      ip_address: req.ip,
      device_info: req.headers['user-agent'],
    });

    return result;
  }

  private stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: Partial<T> = {};
    Object.keys(obj).forEach((k) => {
      const v = obj[k as keyof T];
      if (v !== undefined) out[k as keyof T] = v as T[keyof T];
    });
    return out;
  }

  async checkPatientExists(id: string, organizationId: string) {
    const exists = await this.patientRepository.exists({
      where: { id, organization_id: organizationId },
    });

    return exists;
  }

  async checkPatientNumberExists(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const patient = await this.patientRepository.findOne({
      where: {
        id,

        organization_id: organizationId,
      },
      relations: { contact: true },
    });

    const phone = patient?.contact?.primary_phone?.toString()?.trim();
    return !!phone;
  }

  async updatePatientStatus(patientId: string) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
      relations: { callSchedules: true },
    });

    if (patient) {
      if (patient.callSchedules.length) {
        patient.status = PatientStatusEnum.SCHEDULED;
      } else {
        patient.status = PatientStatusEnum.NOT_SCHEDULED;
      }

      await this.patientRepository.save(patient);
    }
  }

  async findPatientsByIds(patientIds: string[]) {
    const patients = await this.patientRepository.find({
      where: { id: In(patientIds) },
    });

    return patients;
  }

  async getPatientCount(organizationId: string) {
    const totalCount = await this.patientRepository.count({
      where: { organization_id: organizationId },
    });

    return {
      totalPatients: totalCount,
    };
  }
}
