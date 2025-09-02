import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { Brackets, Repository } from 'typeorm';
import { CreatePatientDto } from './dto/create-patient.dto';
import { User } from 'src/users/entities/user.entity';
import { PatientContactDto } from './dto/patient-contacts.dto';
import { PatientContact } from './entities/patient-contact.entity';
import { PatientEmergencyContact } from './entities/patient-emergency-contact.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientsQuery } from './dto/get-patients-query.dto';
import { MedicalInfoDto } from './dto/medical-info.dto';
import { PatientMedicalInfo } from './entities/patient-medical-info.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async findByPatientIdNumber(patientIdNumber: string) {
    return this.patientRepository.findOne({
      where: { patientId: patientIdNumber },
    });
  }

  async findById(id: string) {
    const patient = await this.patientRepository.findOne({
      where: { id },
      relations: {
        createdBy: true,
        updatedBy: true,
        contact: true,
        emergencyContacts: true,
        medicalInfo: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
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
  ) {
    const { status, page, limit, keyword } = getPatientsQuery ?? {};

    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

    const qb = this.patientRepository
      .createQueryBuilder('patient')
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

      if (patient.organization_id !== organizationId) {
        throw new ForbiddenException(
          'You do not have permission to update this patient',
        );
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
      if (patientId !== undefined) patient.patientId = patientId;
      if (dateOfBirth !== undefined) patient.dateOfBirth = dateOfBirth;
      if (gender !== undefined) patient.gender = gender;
      if (preferredName !== undefined) patient.preferredName = preferredName;
      if (careTeam !== undefined) patient.careTeam = careTeam;
      if (floor !== undefined) patient.floor = floor;
      if (roomNumber !== undefined) patient.roomNumber = roomNumber;
      if (notes !== undefined) patient.notes = notes;

      patient.updated_by_id = loggedInUser.id;

      const updatedPatient = await this.patientRepository.save(patient);

      return {
        success: true,
        message: 'Patient updated successfully',
        patient: updatedPatient,
      };
    }

    // 2) No id -> try to find existing patient by patientId (if patientId provided)
    if (patientId) {
      const existingPatient = await this.findByPatientIdNumber(patientId);
      if (existingPatient) {
        // If exists, ensure org and then update (this lets caller upsert by patientId)
        if (existingPatient.organization_id !== organizationId) {
          throw new ForbiddenException(
            'Patient belongs to a different organization',
          );
        }

        // Update only the provided fields
        const patientToUpdate = existingPatient;
        if (firstName !== undefined) patientToUpdate.firstName = firstName;
        if (lastName !== undefined) patientToUpdate.lastName = lastName;
        if (dateOfBirth !== undefined)
          patientToUpdate.dateOfBirth = dateOfBirth;
        if (gender !== undefined) patientToUpdate.gender = gender;
        if (preferredName !== undefined)
          patientToUpdate.preferredName = preferredName;
        if (careTeam !== undefined) patientToUpdate.careTeam = careTeam;
        if (floor !== undefined) patientToUpdate.floor = floor;
        if (roomNumber !== undefined) patientToUpdate.roomNumber = roomNumber;
        if (notes !== undefined) patientToUpdate.notes = notes;

        patientToUpdate.updated_by_id = loggedInUser.id;

        const updatedPatient =
          await this.patientRepository.save(patientToUpdate);

        return {
          success: true,
          message: 'Patient updated successfully',
          patient: updatedPatient,
        };
      }
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
      patientId,
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
  ) {
    // 1) ensure patient exists
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (patient.organization_id !== organizationId) {
      throw new ForbiddenException('Patient belongs to different organization');
    }

    // Use a transaction so patient + contact + emergency contacts update together
    const result = await this.patientRepository.manager.transaction(
      async (manager) => {
        const contactRepo = manager.getRepository(PatientContact);
        const emergencyRepo = manager.getRepository(PatientEmergencyContact);
        const patientRepo = manager.getRepository(Patient);

        // Build contactPayload only with defined fields (so we don't overwrite with undefined)
        const rawContactPayload: Partial<PatientContact> = {
          patient_id: patientId,
          primary_phone: patientContactData.primary_phone,
          alternate_phone: patientContactData.alternate_phone,
          email: patientContactData.email,
          street_address: patientContactData.street_address,
          city: patientContactData.city,
          state: patientContactData.state,
          zip_code: patientContactData.zip_code,
          country: patientContactData.country,
        };

        const contactPayload = this.stripUndefined(rawContactPayload);

        // upsert PatientContact (one-to-one)
        let savedContact: PatientContact;
        const existingContact = await contactRepo.findOne({
          where: { patient_id: patientId },
        });

        if (existingContact) {
          // update only provided fields
          await contactRepo.update({ id: existingContact.id }, contactPayload);
          savedContact = await contactRepo.findOneOrFail({
            where: { id: existingContact.id },
          });
        } else {
          const created = contactRepo.create(contactPayload);
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
            // prepare payload with only defined fields
            const rawEcPayload: Partial<PatientEmergencyContact> = {
              patient_id: patientId,
              name: ec.name,
              relationship: ec.relationship ?? undefined,
              phone: ec.phone,
              alternate_phone: ec.alternate_phone ?? undefined,
              email: ec.email ?? undefined,
              is_primary: ec.is_primary ? true : false,
            };
            const ecPayload = this.stripUndefined(
              rawEcPayload,
            ) as Partial<PatientEmergencyContact>;

            if (ec.id) {
              incomingIdsSet.add(ec.id);
              const existing = existingById.get(ec.id);
              if (existing) {
                // merge existing with payload (so unspecified DB fields are preserved)
                const merged = emergencyRepo.create({
                  ...existing,
                  ...ecPayload,
                } as Partial<PatientEmergencyContact>);
                toSave.push(merged);
              } else {
                // provided id not found -> create new
                const created = emergencyRepo.create(ecPayload);
                toSave.push(created);
              }
            } else {
              // new contact (no id)
              const created = emergencyRepo.create(ecPayload);
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

    const result = await this.patientRepository.manager.transaction(
      async (manager) => {
        const medicalInfoRepo = manager.getRepository(PatientMedicalInfo);
        const patientRepo = manager.getRepository(Patient);

        // Build Medical info payload only with defined fields (so we don't overwrite with undefined)
        const rawMedicalInfoPayload: Partial<PatientMedicalInfo> = {
          patient_id: patientId,
          conditions: medicalInfoDto.conditions,
          medications: medicalInfoDto.medications,
          allergies: medicalInfoDto.allergies,
          primary_physician: medicalInfoDto.primary_physician,
        };

        const medicalInfoPayload = this.stripUndefined(rawMedicalInfoPayload);

        // upsert Medical Info payload (one-to-one)
        let savedMedicalInfo: PatientMedicalInfo;
        const existingMedicalInfo = await medicalInfoRepo.findOne({
          where: { patient_id: patientId },
        });

        if (existingMedicalInfo) {
          // update only provided fields
          await medicalInfoRepo.update(
            { id: existingMedicalInfo.id },
            medicalInfoPayload,
          );
          savedMedicalInfo = await medicalInfoRepo.findOneOrFail({
            where: { id: existingMedicalInfo.id },
          });
        } else {
          const created = medicalInfoRepo.create(medicalInfoPayload);
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
}
