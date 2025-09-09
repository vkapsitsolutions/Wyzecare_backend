import {
  BadRequestException,
  ConflictException,
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

@Injectable()
export class CallScriptsService {
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: Repository<CallScript>,
    @InjectRepository(ScriptQuestion)
    private readonly scriptQuestionRepository: Repository<ScriptQuestion>,

    private readonly aiCallingService: AiCallingService,
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
      .leftJoinAndSelect('script.questions', 'questions')
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

    return {
      success: true,
      message: 'Call scripts fetched success',
      callScripts,
    };
  }

  async findOne(id: string, organizationId: string) {
    const callScript = await this.callScriptRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: { questions: true, created_by: true, updated_by: true },
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
  ) {
    const { callScript } = await this.findOne(id, organizationId);

    if (!callScript.editable) {
      throw new BadRequestException('This call script cannot be edited');
    }

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
}
