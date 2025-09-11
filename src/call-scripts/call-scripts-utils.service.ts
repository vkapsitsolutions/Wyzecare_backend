import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CallScript } from './entities/call-script.entity';
import { Repository } from 'typeorm';
import { ScriptQuestion } from './entities/script-questions.entity';
import { initialCallScripts } from './data/call-script.data';
import slugify from 'slugify';
import { CallScriptsService } from './call-scripts.service';

@Injectable()
export class CallScriptUtilsService {
  private readonly logger = new Logger();
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: Repository<CallScript>,
    @InjectRepository(ScriptQuestion)
    private readonly scriptQuestionRepository: Repository<ScriptQuestion>,

    private readonly callScriptService: CallScriptsService,
  ) {}

  async createDefaultScriptsForOrganization(organizationId: string): Promise<{
    success: boolean;
    createdCount: number;
    created: CallScript[];
    skipped: string[]; // titles
  }> {
    const created: CallScript[] = [];
    const skipped: string[] = [];

    for (const seedDto of initialCallScripts) {
      try {
        const slug = slugify(seedDto.title, {
          lower: true,
          replacement: '_',
          trim: true,
        });

        if (
          await this.callScriptService.checkSlugExists(slug, organizationId)
        ) {
          this.logger.log(`Skipping script (slug exists): ${seedDto.title}`);
          skipped.push(seedDto.title);
          continue;
        }

        const callScript = this.callScriptRepository.create({
          ...seedDto,
          slug,
          editable: false, // cannot be editable
          organization_id: organizationId,
        });

        if (seedDto.questions && seedDto.questions.length > 0) {
          callScript.questions = seedDto.questions.map((qDto) =>
            this.scriptQuestionRepository.create({
              ...qDto,
            }),
          );
        }

        const saved = await this.callScriptRepository.save(callScript);
        this.logger.log(`Created script "${seedDto.title}" (id=${saved.id})`);
        created.push(saved);
      } catch (err: any) {
        this.logger.error(err);
      }
    }

    return {
      success: true,
      createdCount: created.length,
      created,
      skipped,
    };
  }

  async checkScriptExists(id: string, organizationId: string) {
    const exists = await this.callScriptRepository.exists({
      where: { id, organization_id: organizationId },
    });

    return exists;
  }
}
