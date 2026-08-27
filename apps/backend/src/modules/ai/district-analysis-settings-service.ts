import type { DbOrTx } from '../../adapters/db/client.js';
import {
  type DistrictAnalysisSettingsDto,
  type DistrictAnalysisSettingsDraftDto,
  type SaveDistrictAnalysisSettingsDraftRequest,
  type DistrictLocalVocabularyItem,
  DEFAULT_HOKIM_RECOGNITION_TERMS,
} from '@mahalla-ovozi/api-contracts';
import {
  districtAnalysisSettingsRepository,
  type DistrictAnalysisSettingsRepositoryPort,
} from './district-analysis-settings-repository.js';
import {
  type DistrictAnalysisSettingsVersion,
  type DistrictAnalysisSettingsDraft,
} from '../../adapters/db/schema/index.js';
import { recordAuditEvent } from '../audit/audit-service.js';

export class DistrictAnalysisSettingsService {
  private readonly repository: DistrictAnalysisSettingsRepositoryPort;

  constructor(repository: DistrictAnalysisSettingsRepositoryPort) {
    this.repository = repository;
  }

  private mapVersionToDto(
    version: DistrictAnalysisSettingsVersion,
  ): DistrictAnalysisSettingsDto {
    return {
      id: version.id,
      districtId: version.districtId,
      version: version.version,
      hokimRecognitionTerms: (version.hokimRecognitionTerms || []) as string[],
      localVocabularyAdditions: (version.localVocabularyAdditions ||
        []) as DistrictLocalVocabularyItem[],
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
    draft: DistrictAnalysisSettingsDraft,
  ): DistrictAnalysisSettingsDraftDto {
    return {
      id: draft.id,
      districtId: draft.districtId,
      baseActiveVersionId: draft.baseActiveVersionId,
      hokimRecognitionTerms: (draft.hokimRecognitionTerms || []) as string[],
      localVocabularyAdditions: (draft.localVocabularyAdditions ||
        []) as DistrictLocalVocabularyItem[],
      updatedBy: draft.updatedBy,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  async getActiveConfiguration(
    db: DbOrTx,
    districtId: string,
  ): Promise<DistrictAnalysisSettingsDto> {
    const activeRow = await this.repository.getActiveConfiguration(
      db,
      districtId,
    );
    if (!activeRow) {
      // Fallback baseline for districts without activated versions yet
      return {
        id: `dcfg_${districtId}_v1`,
        districtId,
        version: 1,
        hokimRecognitionTerms: [...DEFAULT_HOKIM_RECOGNITION_TERMS],
        localVocabularyAdditions: [],
        isActive: true,
        activatedAt: new Date('2026-08-01T00:00:00.000Z').toISOString(),
        activatedBy: null,
        changeReason: 'Туманнинг дастлабки фаол созламалари',
        createdAt: new Date('2026-08-01T00:00:00.000Z').toISOString(),
      };
    }
    return this.mapVersionToDto(activeRow);
  }

  async getDraft(
    db: DbOrTx,
    districtId: string,
  ): Promise<DistrictAnalysisSettingsDraftDto | null> {
    const draftRow = await this.repository.getDraft(db, districtId);
    if (!draftRow) {
      return null;
    }
    return this.mapDraftToDto(draftRow);
  }

  async saveDraft(
    db: DbOrTx,
    districtId: string,
    actor: {
      id: string;
      role: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    payload: SaveDistrictAnalysisSettingsDraftRequest,
  ): Promise<DistrictAnalysisSettingsDraftDto> {
    if (actor.role !== 'PRODUCT_OWNER') {
      throw new Error(
        'Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.',
      );
    }

    // Sanitize and deduplicate Hokim recognition terms
    const seenTerms = new Set<string>();
    const sanitizedTerms: string[] = [];
    for (const rawTerm of payload.hokimRecognitionTerms) {
      const term = rawTerm.trim().replace(/\s+/g, ' ');
      if (!term) continue;
      const normalized = term
        .normalize('NFC')
        .toLowerCase();
      if (!seenTerms.has(normalized)) {
        seenTerms.add(normalized);
        sanitizedTerms.push(term);
      }
    }

    // Sanitize and deduplicate local vocabulary additions
    const seenVocab = new Set<string>();
    const sanitizedVocabulary: DistrictLocalVocabularyItem[] = [];
    for (const item of payload.localVocabularyAdditions || []) {
      const term = item.term.trim().replace(/\s+/g, ' ');
      if (!term) continue;
      const normalized = term
        .normalize('NFC')
        .toLowerCase();
      if (!seenVocab.has(normalized)) {
        seenVocab.add(normalized);
        sanitizedVocabulary.push({
          term,
          category: item.category.trim().replace(/\s+/g, ' '),
          ...(item.description && item.description.trim()
            ? { description: item.description.trim() }
            : {}),
        });
      }
    }

    const executeInTx = async (tx: DbOrTx) => {
      const activeRow = await this.repository.getActiveConfiguration(
        tx,
        districtId,
      );
      const baseActiveVersionId = activeRow ? activeRow.id : null;

      const saved = await this.repository.saveDraft(tx, {
        id: `draft_${districtId}`,
        districtId,
        baseActiveVersionId,
        hokimRecognitionTerms: sanitizedTerms,
        localVocabularyAdditions: sanitizedVocabulary,
        updatedBy: actor.id,
        updatedAt: new Date(),
      });

      await recordAuditEvent(tx, {
        districtId,
        actorId: actor.id,
        actorRole: 'PRODUCT_OWNER',
        action: 'DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED',
        ipAddress: actor.ipAddress || null,
        userAgent: actor.userAgent || null,
        metadata: {
          baseActiveVersionId,
          hokimTermsCount: sanitizedTerms.length,
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
}

export const districtAnalysisSettingsService =
  new DistrictAnalysisSettingsService(districtAnalysisSettingsRepository);
