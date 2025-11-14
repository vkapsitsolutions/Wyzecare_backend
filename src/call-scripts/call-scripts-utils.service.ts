import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CallScript } from './entities/call-script.entity';
import { Repository } from 'typeorm';
import { ScriptQuestion } from './entities/script-questions.entity';
import { initialCallScripts } from './data/call-script.data';
import slugify from 'slugify';
import { CallScriptsService } from './call-scripts.service';
import { Patient } from 'src/patients/entities/patient.entity';
import { CallMetricsService } from 'src/calls/call-metrics.service';
import { ScriptStatus } from './enums/call-scripts.enum';

@Injectable()
export class CallScriptUtilsService {
  private readonly logger = new Logger();
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: Repository<CallScript>,
    @InjectRepository(ScriptQuestion)
    private readonly scriptQuestionRepository: Repository<ScriptQuestion>,

    private readonly callScriptService: CallScriptsService,

    private readonly callMetricsService: CallMetricsService,
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

  async checkScriptActive(id: string, organizationId: string) {
    const script = await this.callScriptRepository.findOne({
      where: { id, organization_id: organizationId },
    });
    return script?.status === ScriptStatus.ACTIVE;
  }

  async isScriptAssignedToPatient(
    patientId: string,
    scriptId: string,
  ): Promise<boolean> {
    const exists = await this.callScriptRepository
      .createQueryBuilder('script')
      .innerJoin(
        'script.assignedPatients',
        'patient',
        'patient.id = :patientId',
        { patientId },
      )
      .where('script.id = :scriptId', { scriptId })
      .getExists();
    return exists;
  }

  async assignDefaultCallScriptsToPatient(patient: Patient) {
    const defaultCallScripts = await this.callScriptRepository.find({
      where: { organization_id: patient.organization_id, editable: false },
      relations: { assignedPatients: true },
    });

    for (const script of defaultCallScripts) {
      if (!script.assignedPatients.some((p) => p.id === patient.id)) {
        script.assignedPatients.push(patient);
        await this.callScriptRepository.save(script);
      }
    }

    return { success: true };
  }

  async getScriptSuccessRateAndAvgDuration(scriptId: string, period?: number) {
    const callScript = await this.callScriptRepository.findOne({
      where: { id: scriptId },
    });

    if (!callScript) {
      return {
        successRate: 0,
        avgDuration: 0,
      };
    }

    const { successRate } =
      await this.callMetricsService.getCallSuccessRatesByScript(
        scriptId,
        period,
      );

    const avgDuration = await this.callMetricsService.getAvgDurationByScript(
      scriptId,
      period,
    );

    return { successRate, avgDuration };
  }

  async getScriptPerformanceMetrics(organizationId: string, period?: number) {
    const scripts = await this.callScriptRepository.find({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });

    for (const script of scripts) {
      const { avgDuration, successRate } =
        await this.getScriptSuccessRateAndAvgDuration(script.id, period);

      const scriptUsage = await this.callMetricsService.getScriptUsage(
        script.id,
        period,
      );

      script.successRatePercent = successRate;
      script.avgDurationSeconds = avgDuration;
      script.usageCount = scriptUsage;
    }

    return {
      success: true,
      message: 'Script performance metrics fetched',
      scripts,
    };
  }
}
