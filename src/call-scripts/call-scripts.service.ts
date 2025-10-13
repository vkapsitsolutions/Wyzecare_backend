import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CallScript } from './entities/call-script.entity';
import { Brackets, FindOptionsWhere, Not, Repository } from 'typeorm';
import { ScriptQuestion } from './entities/script-questions.entity';
import { CreateCallScriptDto } from './dto/create-call-script.dto';
import { User } from 'src/users/entities/user.entity';
import { UpdateCallScriptDto } from './dto/update-call-script.dto';
import slugify from 'slugify';
import { incrementVersion } from 'src/common/helpers/version-increment';
import { ListCallScriptDto } from './dto/list-call-scripts.dto';
import { TestCallDto } from './dto/test-call.dto';
import { InitiateCallPayload } from 'src/ai-calling/payloads/initiate-call.payload';
import { AiCallingService } from 'src/ai-calling/ai-calling.service';
import { ScriptCategory } from './enums/call-scripts.enum';
import { AssignCallScriptToPatientsDto } from './dto/assign-script.dto';
import { Patient } from 'src/patients/entities/patient.entity';
import { PatientsService } from 'src/patients/patients.service';
import { CallScriptUtilsService } from './call-scripts-utils.service';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditPayload,
} from 'src/audit-logs/entities/audit-logs.entity';
import { Request } from 'express';

@Injectable()
export class CallScriptsService {
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: Repository<CallScript>,
    @InjectRepository(ScriptQuestion)
    private readonly scriptQuestionRepository: Repository<ScriptQuestion>,

    private readonly patientsService: PatientsService,

    private readonly aiCallingService: AiCallingService,

    @Inject(forwardRef(() => CallScriptUtilsService))
    private readonly callScriptUtilsService: CallScriptUtilsService,

    private readonly auditLogsService: AuditLogsService,
  ) {}

  async checkSlugExists(slug: string, orgId: string, excludeId?: string) {
    const where: FindOptionsWhere<CallScript> = {
      organization_id: orgId,
      slug,
    };
    if (excludeId) {
      where.id = Not(excludeId);
    }
    return await this.callScriptRepository.exists({ where });
  }

  async create(
    createCallScriptDto: CreateCallScriptDto,
    organizationId: string,
    user: User,
    req: Request,
  ) {
    const slug = slugify(createCallScriptDto.title, {
      lower: true,
      replacement: '_',
      trim: true,
    });

    if (await this.checkSlugExists(slug, organizationId)) {
      throw new ConflictException(
        'A call script with this slug already exists.',
      );
    }

    const orders =
      createCallScriptDto.questions &&
      createCallScriptDto.questions.map((q) => q.question_order);
    if (orders && new Set(orders).size !== orders.length) {
      throw new BadRequestException(
        'Duplicate question orders detected in update.',
      );
    }

    const callScript = this.callScriptRepository.create({
      ...createCallScriptDto,
      slug,
      category: ScriptCategory.CUSTOM, // forcefully push custom category in create
      organization_id: organizationId,
      created_by_id: user.id,
      updated_by_id: user.id,
    });

    if (createCallScriptDto.questions) {
      callScript.questions = createCallScriptDto.questions.map((qDto) =>
        this.scriptQuestionRepository.create({
          ...qDto,
        }),
      );
    }

    const savedScript = await this.callScriptRepository.save(callScript);

    await this.auditLogsService.createLog({
      organization_id: user.organization_id,
      actor_id: user.id,
      role: user.role?.slug,
      action: AuditAction.CALL_SCRIPT_CREATED,
      module_id: savedScript.id,
      module_name: 'Call Script',
      message: `Created new call script. Name: ${savedScript.title} id: ${savedScript.id}`,
      payload: { after: savedScript }, // Added info
      ip_address: req.ip,
      device_info: req.headers['user-agent'],
    });

    return {
      success: true,
      message: 'Call script created successfully',
      savedScript,
    };
  }

  async findAll(organizationId: string, dto: ListCallScriptDto) {
    const { keyword } = dto;

    const qb = this.callScriptRepository
      .createQueryBuilder('script')
      // .leftJoinAndSelect('script.questions', 'questions')
      .where('script.organization_id = :orgId', { orgId: organizationId });

    if (keyword && String(keyword).trim() !== '') {
      const kw = `%${String(keyword).trim()}%`;
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('script.title ILIKE :kw', { kw })
            .orWhere('script.slug ILIKE :kw', { kw })
            .orWhere('script.opening_message ILIKE :kw', { kw })
            .orWhere('script.closing_message ILIKE :kw', { kw })
            .orWhere('questions.question_text ILIKE :kw', { kw });
        }),
      );
    }

    qb.distinct(true).orderBy('script.created_at', 'DESC');

    const callScripts = await qb.getMany();

    for (const script of callScripts) {
      const { avgDuration, successRate } =
        await this.callScriptUtilsService.getScriptSuccessRateAndAvgDuration(
          script.id,
        );

      script.successRatePercent = successRate;
      script.avgDurationSeconds = avgDuration;
    }

    return {
      success: true,
      message: 'Call scripts fetched success',
      callScripts,
    };
  }

  async findOne(id: string, organizationId: string) {
    const callScript = await this.callScriptRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: {
        questions: true,
        assignedPatients: true,
        created_by: true,
        updated_by: true,
      },
    });
    if (!callScript) {
      throw new NotFoundException(`CallScript with ID ${id} not found`);
    }
    return {
      success: true,
      message: 'Call script fetched',
      callScript,
    };
  }

  async update(
    id: string,
    updateCallScriptDto: UpdateCallScriptDto,
    organizationId: string,
    user: User,
    req: Request,
  ) {
    const { callScript } = await this.findOne(id, organizationId);

    if (!callScript.editable) {
      throw new BadRequestException('This call script cannot be edited');
    }

    const beforeUpdate = { ...callScript };

    let newSlug = callScript.slug;
    if (
      updateCallScriptDto.title &&
      updateCallScriptDto.title !== callScript.title
    ) {
      newSlug = slugify(updateCallScriptDto.title, {
        lower: true,
        replacement: '_',
        trim: true,
      });
      if (
        newSlug !== callScript.slug &&
        (await this.checkSlugExists(newSlug, organizationId, id))
      ) {
        throw new ConflictException(
          'A call script with this slug already exists.',
        );
      }
    }

    Object.assign(callScript, {
      ...updateCallScriptDto,
      questions: callScript.questions,
      slug: newSlug,
      updated_by_id: user.id,
      version:
        updateCallScriptDto.version ??
        (callScript.version ? incrementVersion(callScript.version) : 'v1.0'),
      category: ScriptCategory.CUSTOM, // force custom category in edit
    });

    // --- QUESTIONS MERGE LOGIC ---
    if (updateCallScriptDto.questions) {
      const existingQuestions = callScript.questions ?? [];
      const existingById = new Map<string, ScriptQuestion>();
      for (const q of existingQuestions) {
        if (q.id) existingById.set(q.id, q);
      }

      const updatedQuestions: ScriptQuestion[] = [];
      const keepIds = new Set<string>();
      const orders: number[] = [];

      for (const qDto of updateCallScriptDto.questions) {
        // If DTO has an id and it exists in DB -> update it
        if (qDto.id && existingById.has(qDto.id)) {
          const question = existingById.get(qDto.id)!;
          Object.assign(question, qDto);
          updatedQuestions.push(question);
          keepIds.add(qDto.id);
          if (typeof question.question_order === 'number')
            orders.push(question.question_order);
        } else {
          // New question (no matching id) -> create entity and attach to parent
          const newQuestion = this.scriptQuestionRepository.create({
            ...qDto,
            script: callScript, // ensure relation is set
            script_id: callScript.id, // defensive: set FK explicitly if your entity uses it
          });
          updatedQuestions.push(newQuestion);
          if (typeof newQuestion.question_order === 'number')
            orders.push(newQuestion.question_order);
        }
      }

      // Validate duplicate question_order BEFORE mutating DB
      if (orders.length > 0) {
        const uniqueOrders = new Set(orders);
        if (uniqueOrders.size !== orders.length) {
          throw new BadRequestException(
            'Duplicate question orders detected in update.',
          );
        }
      }

      // Remove existing questions omitted from the DTO
      const questionsToRemove = existingQuestions.filter(
        (q) => q.id && !keepIds.has(q.id),
      );
      if (questionsToRemove.length > 0) {
        // remove explicitly omitted questions
        await this.scriptQuestionRepository.remove(questionsToRemove);
      }

      // Save updated + new questions (saves both persisted and new entities)
      // This is safer than relying on cascade behavior
      await this.scriptQuestionRepository.save(updatedQuestions);

      // Reload questions for the callScript to ensure consistency
      callScript.questions = await this.scriptQuestionRepository.find({
        where: { script: { id: callScript.id } },
        order: { question_order: 'ASC' },
      });
    }

    // --- SAVE SCRIPT ---
    const updatedScript = await this.callScriptRepository.save(callScript);

    const payload: AuditPayload = {
      before: beforeUpdate,
      after: updatedScript,
    };

    await this.auditLogsService.createLog({
      organization_id: user.organization_id,
      actor_id: user.id,
      role: user.role?.slug,
      action: AuditAction.CALL_SCRIPT_UPDATED,
      module_id: updatedScript.id,
      module_name: 'Call Script',
      message: `Edited edited call script. Title: ${updatedScript.title} id: ${updatedScript.id}`,
      payload,
      ip_address: req.ip,
      device_info: req.headers['user-agent'],
    });

    return {
      success: true,
      message: 'Call script updated',
      updatedScript,
    };
  }

  async remove(id: string, organizationId: string) {
    const { callScript } = await this.findOne(id, organizationId);
    const deleted = await this.callScriptRepository.softRemove(callScript);

    return {
      success: true,
      message: 'Call script deleted',
      deletedResult: deleted,
    };
  }

  async testCallScript(
    id: string,
    organizationId: string,
    testCallDto: TestCallDto,
    loggedInUser: User,
  ) {
    const { callScript } = await this.findOne(id, organizationId);

    const { phoneNumber } = testCallDto;
    const payload: InitiateCallPayload = {
      patient_number: phoneNumber,
      patient_name: loggedInUser.fullName,
      preferred_name: loggedInUser.fullName,
      title: callScript.title,
      category: callScript.category,
      prefer_to_talk: 'female',
      status: callScript.status,
      opening_message: callScript.opening_message,
      closing_message: callScript.closing_message,
      escalation_triggers: callScript.escalation_triggers
        ? callScript.escalation_triggers
        : [],
      questions: callScript.questions ? callScript.questions : [],
    };

    const res = await this.aiCallingService.initiateCall(payload);

    return {
      success: true,
      message: 'Call initiated successfully',
      result: res,
    };
  }

  async assignPatients(
    scriptId: string,
    assignDto: AssignCallScriptToPatientsDto,
  ) {
    const { patientIds } = assignDto;
    const targetScript = await this.callScriptRepository.findOne({
      where: { id: scriptId },
    });

    if (!targetScript) {
      throw new NotFoundException('Call script not found');
    }

    let patients: Patient[] = [];
    if (Array.isArray(patientIds) && patientIds.length > 0) {
      patients = await this.patientsService.findPatientsByIds(patientIds);
    }

    targetScript.assignedPatients = patients;

    await this.callScriptRepository.save(targetScript);

    return { success: true, message: 'Call script assigned to patients' };
  }
}
