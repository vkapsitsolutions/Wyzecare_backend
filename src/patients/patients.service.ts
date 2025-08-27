import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreatePatientDto } from './dto/create-patient.dto';
import { User } from 'src/users/entities/user.entity';
import { PatientContactDto } from './dto/patient-contacts.dto';
import { PatientContact } from './entities/patient-contact.entity';
import { PatientEmergencyContact } from './entities/patient-emergency-contact.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientsQuery } from './dto/get-patients-query.dto';

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
    const { status, page, limit } = getPatientsQuery ?? {};

    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

    // build where clause
    const where: FindOptionsWhere<Patient> = {
      organization_id: organizationId,
    };
    if (status) {
      where.status = status;
    }

    const [patients, total] = await this.patientRepository.findAndCount({
      where,
      skip: (pageNum - 1) * perPage,
      take: perPage,
      order: { created_at: 'DESC' },
    });

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

  async createNewPatient(
    createPatientDto: CreatePatientDto,
    organizationId: string,
    loggedInUser: User,
  ) {
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
    } = createPatientDto;

    const existingPatient = await this.patientRepository.findOne({
      where: { patientId },
    });

    if (existingPatient) {
      throw new ForbiddenException(
        `Patient with ID ${patientId} already exists`,
      );
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

  async updatePatient(
    id: string,
    updatePatientDto: UpdatePatientDto,
    organizationId: string,
    loggedInUser: User,
  ) {
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
    } = updatePatientDto;

    const { patient } = await this.findById(id);

    if (patient.organization_id !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to update this patient',
      );
    }

    if (patientId && patient.patientId !== updatePatientDto?.patientId) {
      const existingPatient = await this.findByPatientIdNumber(patientId);

      if (existingPatient) {
        throw new ConflictException(
          `Patient with ID ${patientId} already exists`,
        );
      }
    }

    if (firstName) patient.firstName = firstName;
    if (lastName) patient.lastName = lastName;
    if (patientId) patient.patientId = patientId;
    if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
    if (gender) patient.gender = gender;
    if (preferredName) patient.preferredName = preferredName;
    if (careTeam) patient.careTeam = careTeam;
    if (floor) patient.floor = floor;
    if (roomNumber) patient.roomNumber = roomNumber;
    if (notes) patient.notes = notes;

    patient.updated_by_id = loggedInUser.id;

    const updatedPatient = await this.patientRepository.save(patient);

    return {
      success: true,
      message: 'Patient updated successfully',
      patient: updatedPatient,
    };
  }

  async updatePatientContactAndEmergency(
    patientId: string,
    loggedInUser: User,
    patientContactData: PatientContactDto,
    organizationId: string,
  ) {
    // 1) ensure patient exists
    const { patient } = await this.findById(patientId);

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

        // *** NEW: update patient.updated_by_id with the logged in user id (audit) ***
        // Only update if loggedInUser.id is present
        if (loggedInUser?.id) {
          await patientRepo.update({ id: patientId }, {
            updated_by_id: loggedInUser.id,
          } as Partial<Patient>);
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

  private stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: Partial<T> = {};
    Object.keys(obj).forEach((k) => {
      const v = obj[k as keyof T];
      if (v !== undefined) out[k as keyof T] = v as T[keyof T];
    });
    return out;
  }
}
