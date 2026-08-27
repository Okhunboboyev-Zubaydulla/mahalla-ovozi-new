import type { DbOrTx } from '../../adapters/db/client.js';
import {
  type GlobalAnalysisSettingsDto,
  type GlobalAnalysisSettingsDraftDto,
  type SaveGlobalAnalysisSettingsDraftRequest,
  type GlobalServiceVocabularyItem,
  type AiModelProvider,
} from '@mahalla-ovozi/api-contracts';
import {
  globalAnalysisSettingsRepository,
  type GlobalAnalysisSettingsRepositoryPort,
} from './global-analysis-settings-repository.js';
import {
  type GlobalAnalysisSettingsVersion,
  type GlobalAnalysisSettingsDraft,
  defaultGlobalAnalysisSettingsVersion,
} from '../../adapters/db/schema/index.js';
import { recordAuditEvent } from '../audit/audit-service.js';

export class GlobalAnalysisSettingsService {
  private readonly repository: GlobalAnalysisSettingsRepositoryPort;

  constructor(repository: GlobalAnalysisSettingsRepositoryPort) {
    this.repository = repository;
  }

  private mapVersionToDto(
    version: GlobalAnalysisSettingsVersion,
  ): GlobalAnalysisSettingsDto {
    return {
      id: version.id,
      version: version.version,
      modelProvider: version.modelProvider as AiModelProvider,
      modelId: version.modelId,
      temperature: version.temperature,
      maxOutputTokens: version.maxOutputTokens,
      relevanceSystemPrompt: version.relevanceSystemPrompt,
      topicMatchingSystemPrompt: version.topicMatchingSystemPrompt,
      topicProjectionSystemPrompt: version.topicProjectionSystemPrompt,
      globalServiceVocabulary: (version.globalServiceVocabulary ||
        []) as GlobalServiceVocabularyItem[],
      isActive: version.isActive,
      activatedAt: version.activatedAt
        ? version.activatedAt.toISOString()
        : null,
      activatedBy: version.activatedBy,
      changeReason: version.changeReason,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private mapDraftToDto(
    draft: GlobalAnalysisSettingsDraft,
  ): GlobalAnalysisSettingsDraftDto {
    return {
      id: 'global',
      baseActiveVersionId: draft.baseActiveVersionId,
      modelProvider: draft.modelProvider as AiModelProvider,
      modelId: draft.modelId,
      temperature: draft.temperature,
      maxOutputTokens: draft.maxOutputTokens,
      relevanceSystemPrompt: draft.relevanceSystemPrompt,
      topicMatchingSystemPrompt: draft.topicMatchingSystemPrompt,
      topicProjectionSystemPrompt: draft.topicProjectionSystemPrompt,
      globalServiceVocabulary: (draft.globalServiceVocabulary ||
        []) as GlobalServiceVocabularyItem[],
      updatedBy: draft.updatedBy,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  async getActiveConfiguration(
    db: DbOrTx,
  ): Promise<GlobalAnalysisSettingsDto> {
    const activeRow = await this.repository.getActiveConfiguration(db);
    if (!activeRow) {
      // Fallback for unseeded test environments
      return {
        id: defaultGlobalAnalysisSettingsVersion.id,
        version: defaultGlobalAnalysisSettingsVersion.version,
        modelProvider: defaultGlobalAnalysisSettingsVersion.modelProvider as AiModelProvider,
        modelId: defaultGlobalAnalysisSettingsVersion.modelId,
        temperature: defaultGlobalAnalysisSettingsVersion.temperature ?? 0.0,
        maxOutputTokens: defaultGlobalAnalysisSettingsVersion.maxOutputTokens ?? 500,
        relevanceSystemPrompt: defaultGlobalAnalysisSettingsVersion.relevanceSystemPrompt,
        topicMatchingSystemPrompt: defaultGlobalAnalysisSettingsVersion.topicMatchingSystemPrompt,
        topicProjectionSystemPrompt: defaultGlobalAnalysisSettingsVersion.topicProjectionSystemPrompt,
        globalServiceVocabulary: defaultGlobalAnalysisSettingsVersion.globalServiceVocabulary as GlobalServiceVocabularyItem[],
        isActive: true,
        activatedAt: defaultGlobalAnalysisSettingsVersion.activatedAt
          ? defaultGlobalAnalysisSettingsVersion.activatedAt.toISOString()
          : new Date().toISOString(),
        activatedBy: null,
        changeReason: defaultGlobalAnalysisSettingsVersion.changeReason,
        createdAt: defaultGlobalAnalysisSettingsVersion.createdAt
          ? defaultGlobalAnalysisSettingsVersion.createdAt.toISOString()
          : new Date().toISOString(),
      };
    }
    return this.mapVersionToDto(activeRow);
  }

  async getDraft(
    db: DbOrTx,
  ): Promise<GlobalAnalysisSettingsDraftDto | null> {
    const draftRow = await this.repository.getDraft(db);
    if (!draftRow) {
      return null;
    }
    return this.mapDraftToDto(draftRow);
  }

  async saveDraft(
    db: DbOrTx,
    actor: { id: string; role: string; ipAddress?: string | null; userAgent?: string | null },
    payload: SaveGlobalAnalysisSettingsDraftRequest,
  ): Promise<GlobalAnalysisSettingsDraftDto> {
    if (actor.role !== 'PRODUCT_OWNER') {
      throw new Error('Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.');
    }

    const activeConfig = await this.getActiveConfiguration(db);

    // Sanitize and deduplicate vocabulary items (case-insensitive)
    const seen = new Set<string>();
    const sanitizedVocabulary: GlobalServiceVocabularyItem[] = [];
    for (const item of payload.globalServiceVocabulary) {
      const term = item.term.trim();
      const normalized = term.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        sanitizedVocabulary.push({
          term,
          category: item.category.trim(),
          ...(item.description && item.description.trim()
            ? { description: item.description.trim() }
            : {}),
        });
      }
    }

    const saved = await this.repository.saveDraft(db, {
      id: 'global',
      baseActiveVersionId: activeConfig.id,
      modelProvider: payload.modelProvider,
      modelId: payload.modelId.trim(),
      temperature: payload.temperature,
      maxOutputTokens: payload.maxOutputTokens,
      relevanceSystemPrompt: payload.relevanceSystemPrompt.trim(),
      topicMatchingSystemPrompt: payload.topicMatchingSystemPrompt.trim(),
      topicProjectionSystemPrompt: payload.topicProjectionSystemPrompt.trim(),
      globalServiceVocabulary: sanitizedVocabulary,
      updatedBy: actor.id,
      updatedAt: new Date(),
    });

    await recordAuditEvent(db, {
      districtId: null,
      actorId: actor.id,
      actorRole: 'PRODUCT_OWNER',
      action: 'GLOBAL_ANALYSIS_SETTINGS_DRAFT_SAVED',
      ipAddress: actor.ipAddress || null,
      userAgent: actor.userAgent || null,
      metadata: {
        baseActiveVersionId: activeConfig.id,
        modelProvider: payload.modelProvider,
        modelId: payload.modelId.trim(),
        temperature: payload.temperature,
        maxOutputTokens: payload.maxOutputTokens,
        vocabularyCount: sanitizedVocabulary.length,
      },
    });

    return this.mapDraftToDto(saved);
  }
}

export const globalAnalysisSettingsService = new GlobalAnalysisSettingsService(
  globalAnalysisSettingsRepository,
);
