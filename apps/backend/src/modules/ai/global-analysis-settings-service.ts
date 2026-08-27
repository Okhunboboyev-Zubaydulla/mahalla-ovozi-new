import type { DbOrTx } from '../../adapters/db/client.js';
import {
  type GlobalAnalysisSettingsDto,
  type GlobalAnalysisSettingsDraftDto,
  type SaveGlobalAnalysisSettingsDraftRequest,
  type ActivateGlobalAnalysisSettingsRequest,
  type ActivateGlobalAnalysisSettingsResponse,
  type GlobalAnalysisSettingsHistoryResponse,
  type RollbackGlobalAnalysisSettingsRequest,
  type RollbackGlobalAnalysisSettingsResponse,
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

function areGlobalVocabulariesEqual(
  a: GlobalServiceVocabularyItem[],
  b: GlobalServiceVocabularyItem[],
): boolean {
  const normalizeMap = (items: GlobalServiceVocabularyItem[]) => {
    const map = new Map<
      string,
      { term: string; category: string; description: string }
    >();
    for (const i of items || []) {
      if (!i || typeof i.term !== 'string') continue;
      const normalizedKey = i.term
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .normalize('NFC');
      if (!normalizedKey) continue;
      map.set(normalizedKey, {
        term: i.term.trim().replace(/\s+/g, ' ').normalize('NFC'),
        category: (i.category || '').trim().replace(/\s+/g, ' '),
        description: (i.description || '').trim().replace(/\s+/g, ' '),
      });
    }
    return map;
  };

  const mapA = normalizeMap(a);
  const mapB = normalizeMap(b);

  if (mapA.size !== mapB.size) return false;

  for (const [key, itemA] of mapA.entries()) {
    const itemB = mapB.get(key);
    if (!itemB) return false;
    if (itemA.category !== itemB.category) return false;
    if (itemA.description !== itemB.description) return false;
  }
  return true;
}

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

    // Sanitize and deduplicate vocabulary items (case-insensitive & NFC normalized)
    const seen = new Set<string>();
    const sanitizedVocabulary: GlobalServiceVocabularyItem[] = [];
    for (const item of payload.globalServiceVocabulary) {
      const term = item.term.trim();
      const normalized = term
        .normalize('NFC')
        .replace(/\s+/g, ' ')
        .toLowerCase();
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

    const executeInTx = async (tx: DbOrTx) => {
      const saved = await this.repository.saveDraft(tx, {
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

      await recordAuditEvent(tx, {
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

      return saved;
    };

    const saved =
      'transaction' in db && typeof db.transaction === 'function'
        ? await db.transaction(async (tx) => executeInTx(tx))
        : await executeInTx(db);

    return this.mapDraftToDto(saved);
  }

  async activateDraft(
    db: DbOrTx,
    actor: {
      id: string;
      role: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    payload: ActivateGlobalAnalysisSettingsRequest,
  ): Promise<ActivateGlobalAnalysisSettingsResponse> {
    if (actor.role !== 'PRODUCT_OWNER') {
      throw new Error('Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.');
    }

    const executeInTx = async (tx: DbOrTx) => {
      // 1. Fetch current active configuration with row lock
      const activeRow = await this.repository.getActiveConfigurationForUpdate(tx);
      const currentActive = activeRow || defaultGlobalAnalysisSettingsVersion;

      // 2. Validate base active version (optimistic concurrency guard)
      if (currentActive.id !== payload.baseActiveVersionId) {
        const error = new Error(
          'Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.',
        );
        (error as any).code = 'STALE_BASELINE_VERSION';
        (error as any).statusCode = 409;
        throw error;
      }

      // 3. Fetch draft
      const draft = await this.repository.getDraft(tx);
      if (!draft) {
        const error = new Error('Фаоллаштириш учун қоралама топилмади.');
        (error as any).code = 'DRAFT_NOT_FOUND';
        (error as any).statusCode = 400;
        throw error;
      }

      // 4. Validate effective changes exist
      const hasChanges =
        draft.modelProvider !== currentActive.modelProvider ||
        draft.modelId.trim() !== currentActive.modelId.trim() ||
        Number(draft.temperature) !== Number(currentActive.temperature) ||
        Number(draft.maxOutputTokens) !== Number(currentActive.maxOutputTokens) ||
        draft.relevanceSystemPrompt.trim() !==
          currentActive.relevanceSystemPrompt.trim() ||
        draft.topicMatchingSystemPrompt.trim() !==
          currentActive.topicMatchingSystemPrompt.trim() ||
        draft.topicProjectionSystemPrompt.trim() !==
          currentActive.topicProjectionSystemPrompt.trim() ||
        !areGlobalVocabulariesEqual(
          (draft.globalServiceVocabulary || []) as GlobalServiceVocabularyItem[],
          (currentActive.globalServiceVocabulary || []) as GlobalServiceVocabularyItem[],
        );

      if (!hasChanges) {
        const error = new Error(
          'Қораламада фаол созламаларга нисбатан ҳеч қандай ўзгариш мавжуд эмас.',
        );
        (error as any).code = 'NO_EFFECTIVE_CHANGES';
        (error as any).statusCode = 400;
        throw error;
      }

      // 5. Deactivate prior active version
      if (currentActive.id) {
        await this.repository.deactivateVersion(tx, currentActive.id);
      }

      // 6. Compute next version number
      const maxVersion = await this.repository.getNextVersionNumber(tx);
      const nextVersion = Math.max(maxVersion, (currentActive?.version ?? 1) + 1);
      const newVersionId = `gcfg_v${nextVersion}`;

      // 7. Insert new immutable active version
      const newVersionRow = await this.repository.insertVersion(tx, {
        id: newVersionId,
        version: nextVersion,
        modelProvider: draft.modelProvider,
        modelId: draft.modelId,
        temperature: draft.temperature,
        maxOutputTokens: draft.maxOutputTokens,
        relevanceSystemPrompt: draft.relevanceSystemPrompt,
        topicMatchingSystemPrompt: draft.topicMatchingSystemPrompt,
        topicProjectionSystemPrompt: draft.topicProjectionSystemPrompt,
        globalServiceVocabulary: draft.globalServiceVocabulary,
        isActive: true,
        activatedAt: new Date(),
        activatedBy: actor.id,
        changeReason: payload.changeReason.trim(),
        createdAt: new Date(),
      });

      // 8. Delete draft
      await this.repository.deleteDraft(tx);

      // 9. Record audit trail event
      await recordAuditEvent(tx, {
        districtId: null,
        actorId: actor.id,
        actorRole: 'PRODUCT_OWNER',
        action: 'GLOBAL_ANALYSIS_SETTINGS_ACTIVATED',
        ipAddress: actor.ipAddress || null,
        userAgent: actor.userAgent || null,
        metadata: {
          previousVersionId: currentActive.id,
          newVersionId: newVersionRow.id,
          newVersion: nextVersion,
          modelProvider: newVersionRow.modelProvider,
          modelId: newVersionRow.modelId,
          changeReason: payload.changeReason.trim(),
        },
      });

      return {
        activeConfiguration: this.mapVersionToDto(newVersionRow),
        previousVersionId: currentActive.id,
        message: `Глобал таҳлил созламалари муваффақиятли фаоллаштирилди. Янги версия: ${newVersionRow.id}`,
      };
    };

    return 'transaction' in db && typeof db.transaction === 'function'
      ? await db.transaction(async (tx) => executeInTx(tx))
      : await executeInTx(db);
  }

  async getHistory(
    db: DbOrTx,
  ): Promise<GlobalAnalysisSettingsHistoryResponse> {
    const versions = await this.repository.getHistory(db);
    if (versions.length === 0) {
      const active = await this.getActiveConfiguration(db);
      return {
        items: [active],
        totalCount: 1,
      };
    }
    const items = versions.map((v) => this.mapVersionToDto(v));
    return {
      items,
      totalCount: items.length,
    };
  }

  async rollback(
    db: DbOrTx,
    actor: {
      id: string;
      role: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    payload: RollbackGlobalAnalysisSettingsRequest,
  ): Promise<RollbackGlobalAnalysisSettingsResponse> {
    if (actor.role !== 'PRODUCT_OWNER') {
      const error = new Error(
        'Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.',
      );
      (error as any).code = 'FORBIDDEN';
      (error as any).statusCode = 403;
      throw error;
    }

    const executeInTx = async (tx: DbOrTx) => {
      // 1. Fetch current active configuration with row lock via repository port
      const activeRow = await this.repository.getActiveConfigurationForUpdate(tx);
      const currentActive = activeRow || defaultGlobalAnalysisSettingsVersion;

      // 2. Validate base active version (optimistic concurrency guard)
      if (currentActive.id !== payload.baseActiveVersionId) {
        const error = new Error(
          'Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.',
        );
        (error as any).code = 'STALE_BASELINE_VERSION';
        (error as any).statusCode = 409;
        throw error;
      }

      // 3. Fetch target historical version via repository port
      const targetRow = await this.repository.getVersionById(
        tx,
        payload.targetVersionId,
      );

      if (!targetRow) {
        const error = new Error('Қайтариш учун танланган тарихий версия топилмади.');
        (error as any).code = 'VERSION_NOT_FOUND';
        (error as any).statusCode = 404;
        throw error;
      }

      // 4. Validate that target is not already the active version
      if (targetRow.id === currentActive.id) {
        const error = new Error(
          'Танланган версия аллақачон фаол ҳисобланади. Қайтариш учун олдинги тарихий версияни танланг.',
        );
        (error as any).code = 'NO_EFFECTIVE_ROLLBACK';
        (error as any).statusCode = 400;
        throw error;
      }

      // 5. Deactivate prior active version
      if (currentActive.id) {
        await this.repository.deactivateVersion(tx, currentActive.id);
      }

      // 6. Compute next version number
      const maxVersion = await this.repository.getNextVersionNumber(tx);
      const nextVersion = Math.max(maxVersion, (currentActive?.version ?? 1) + 1);
      const newVersionId = `gcfg_v${nextVersion}`;

      // 7. Insert new immutable active version copying from target
      const newVersionRow = await this.repository.insertVersion(tx, {
        id: newVersionId,
        version: nextVersion,
        modelProvider: targetRow.modelProvider,
        modelId: targetRow.modelId,
        temperature: targetRow.temperature,
        maxOutputTokens: targetRow.maxOutputTokens,
        relevanceSystemPrompt: targetRow.relevanceSystemPrompt,
        topicMatchingSystemPrompt: targetRow.topicMatchingSystemPrompt,
        topicProjectionSystemPrompt: targetRow.topicProjectionSystemPrompt,
        globalServiceVocabulary: targetRow.globalServiceVocabulary,
        isActive: true,
        activatedAt: new Date(),
        activatedBy: actor.id,
        changeReason: payload.changeReason.trim(),
        createdAt: new Date(),
      });

      // 8. Record audit trail event
      await recordAuditEvent(tx, {
        districtId: null,
        actorId: actor.id,
        actorRole: 'PRODUCT_OWNER',
        action: 'GLOBAL_ANALYSIS_SETTINGS_ROLLED_BACK',
        ipAddress: actor.ipAddress || null,
        userAgent: actor.userAgent || null,
        metadata: {
          previousActiveVersionId: currentActive.id,
          targetSourceVersionId: targetRow.id,
          newVersionId: newVersionRow.id,
          newVersion: nextVersion,
          changeReason: payload.changeReason.trim(),
        },
      });

      return {
        activeConfiguration: this.mapVersionToDto(newVersionRow),
        restoredFromVersionId: targetRow.id,
        previousActiveVersionId: currentActive.id,
        message: `Глобал таҳлил созламалари V${targetRow.version} ҳолатига янги V${nextVersion} версияси сифатида муваффақиятли қайтарилди.`,
      };
    };

    return 'transaction' in db && typeof db.transaction === 'function'
      ? await db.transaction(async (tx) => executeInTx(tx))
      : await executeInTx(db);
  }
}

export const globalAnalysisSettingsService = new GlobalAnalysisSettingsService(
  globalAnalysisSettingsRepository,
);


