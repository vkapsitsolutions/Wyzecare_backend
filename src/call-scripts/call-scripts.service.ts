import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CallScript } from './entities/call-script.entity';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { ScriptQuestion } from './entities/script-questions.entity';
import { CreateCallScriptDto } from './dto/create-call-script.dto';
import { User } from 'src/users/entities/user.entity';
import { UpdateCallScriptDto } from './dto/update-call-script.dto';
import slugify from 'slugify';
// import { CreateScriptQuestionDto } from './dto/create-question.dto';
// import { UpdateScriptQuestionDto } from './dto/update-question.dto';

@Injectable()
export class CallScriptsService {
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: Repository<CallScript>,
    @InjectRepository(ScriptQuestion)
    private readonly scriptQuestionRepository: Repository<ScriptQuestion>,
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

  async findAll(organizationId: string) {
    const callScripts = await this.callScriptRepository.find({
      where: { organization_id: organizationId },
      relations: ['questions'],
      order: { created_at: 'DESC' },
    });

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
      slug: newSlug,
      updated_by_id: user.id,
    });

    if (updateCallScriptDto.questions) {
      const existingQuestions = callScript.questions || [];
      const updatedQuestions: ScriptQuestion[] = [];

      for (const qDto of updateCallScriptDto.questions) {
        let question = existingQuestions.find((q) => q.id === qDto.id);
        if (question) {
          Object.assign(question, qDto);
        } else {
          question = this.scriptQuestionRepository.create({
            ...qDto,
          });
        }
        updatedQuestions.push(question);
      }

      const questionsToRemove = existingQuestions.filter(
        (q) =>
          !(updateCallScriptDto.questions ?? []).some(
            (qDto) => qDto.id === q.id,
          ),
      );
      if (questionsToRemove.length > 0) {
        await this.scriptQuestionRepository.remove(questionsToRemove);
      }

      callScript.questions = updatedQuestions;
    }

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

  // Separate methods for questions if needed,

  //   async createQuestion(
  //     scriptId: string,
  //     createQuestionDto: CreateScriptQuestionDto,
  //     organizationId: string,
  //   ): Promise<ScriptQuestion> {
  //     const { callScript } = await this.findOne(scriptId, organizationId);
  //     const question = this.scriptQuestionRepository.create({
  //       ...createQuestionDto,
  //       script: callScript,
  //     });
  //     return this.scriptQuestionRepository.save(question);
  //   }

  //   async findQuestions(
  //     scriptId: string,
  //     organizationId: string,
  //   ): Promise<ScriptQuestion[]> {
  //     await this.findOne(scriptId, organizationId); // Validate script exists
  //     return this.scriptQuestionRepository.find({
  //       where: { script_id: scriptId },
  //       order: { question_order: 'ASC' },
  //     });
  //   }

  //   async updateQuestion(
  //     questionId: string,
  //     updateQuestionDto: UpdateScriptQuestionDto,
  //     organizationId: string,
  //   ): Promise<ScriptQuestion> {
  //     const question = await this.scriptQuestionRepository.findOne({
  //       where: { id: questionId },
  //       relations: ['script'],
  //     });
  //     if (!question || question.script.organization_id !== organizationId) {
  //       throw new NotFoundException(
  //         `ScriptQuestion with ID ${questionId} not found`,
  //       );
  //     }
  //     Object.assign(question, updateQuestionDto);
  //     return this.scriptQuestionRepository.save(question);
  //   }

  //   async removeQuestion(
  //     questionId: string,
  //     organizationId: string,
  //   ): Promise<void> {
  //     const question = await this.scriptQuestionRepository.findOne({
  //       where: { id: questionId },
  //       relations: ['script'],
  //     });
  //     if (!question || question.script.organization_id !== organizationId) {
  //       throw new NotFoundException(
  //         `ScriptQuestion with ID ${questionId} not found`,
  //       );
  //     }
  //     await this.scriptQuestionRepository.remove(question);
  //   }
}
