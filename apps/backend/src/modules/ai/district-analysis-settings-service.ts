import { eq } from 'drizzle-orm';
import type { DbOrTx } from '../../adapters/db/client.js';
import {
  type DistrictAnalysisSettingsDto,
  type DistrictAnalysisSettingsDraftDto,
  type SaveDistrictAnalysisSettingsDraftRequest,
  type ActivateDistrictAnalysisSettingsRequest,
  type ActivateDistrictAnalysisSettingsResponse,
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
  districts,
} from '../../adapters/db/schema/index.js';
import { recordAuditEvent } from '../audit/audit-service.js';

function areHokimTermsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(
    a.map((t) => t.trim().toLowerCase().normalize('NFC')),
  );
  for (const item of b) {
    if (!setA.has(item.trim().toLowerCase().normalize('NFC'))) return false;
  }
  return true;
}

function areDistrictVocabulariesEqual(
  a: DistrictLocalVocabularyItem[],
  b: DistrictLocalVocabularyItem[],
): boolean {
  if (a.length !== b.length) return false;
  const mapA = new Map(
    a.map((i) => [
      i.term.trim().toLowerCase().normalize('NFC'),
      {
        term: i.term.trim().normalize('NFC'),
        category: i.category.trim(),
        description: (i.description || '').trim(),
      },
    ]),
  );
  for (const itemB of b) {
    const key = itemB.term.trim().toLowerCase().normalize('NFC');
    const itemA = mapA.get(key);
    if (!itemA) return false;
    if (itemA.category !== itemB.category.trim()) return false;
    if (itemA.description !== (itemB.description || '').trim()) return false;
  }
  return true;
}

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

  async activateDraft(
    db: DbOrTx,
    districtId: string,
    actor: {
      id: string;
      role: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    payload: ActivateDistrictAnalysisSettingsRequest,
  ): Promise<ActivateDistrictAnalysisSettingsResponse> {
    if (actor.role !== 'PRODUCT_OWNER') {
      throw new Error(
        'Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.',
      );
    }

    const executeInTx = async (tx: DbOrTx) => {
      // 1. Fetch district to verify existence and get district name
      const [district] = await tx
        .select({ id: districts.id, name: districts.name })
        .from(districts)
        .where(eq(districts.id, districtId))
        .limit(1);

      if (!district) {
        const error = new Error('Туман топилмади.');
        (error as any).code = 'DISTRICT_NOT_FOUND';
        (error as any).statusCode = 404;
        throw error;
      }

      // 2. Fetch current active configuration with row lock
      const activeRow = await this.repository.getActiveConfigurationForUpdate(
        tx,
        districtId,
      );

      const defaultBaseline: DistrictAnalysisSettingsDto = {
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

      const currentActiveId = activeRow ? activeRow.id : defaultBaseline.id;
      const currentHokimTerms = activeRow
        ? ((activeRow.hokimRecognitionTerms || []) as string[])
        : defaultBaseline.hokimRecognitionTerms;
      const currentVocabulary = activeRow
        ? ((activeRow.localVocabularyAdditions ||
            []) as DistrictLocalVocabularyItem[])
        : defaultBaseline.localVocabularyAdditions;

      // 3. Validate base active version (optimistic concurrency guard)
      if (payload.baseActiveVersionId !== currentActiveId) {
        const error = new Error(
          'Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.',
        );
        (error as any).code = 'STALE_BASELINE_VERSION';
        (error as any).statusCode = 409;
        throw error;
      }

      // 4. Fetch draft
      const draft = await this.repository.getDraft(tx, districtId);
      if (!draft) {
        const error = new Error('Фаоллаштириш учун қоралама топилмади.');
        (error as any).code = 'DRAFT_NOT_FOUND';
        (error as any).statusCode = 400;
        throw error;
      }

      // 5. Validate effective changes exist
      const draftHokimTerms = (draft.hokimRecognitionTerms || []) as string[];
      const draftVocabulary = (draft.localVocabularyAdditions ||
        []) as DistrictLocalVocabularyItem[];

      const hasChanges =
        !areHokimTermsEqual(draftHokimTerms, currentHokimTerms) ||
        !areDistrictVocabulariesEqual(draftVocabulary, currentVocabulary);

      if (!hasChanges) {
        const error = new Error(
          'Қораламада фаол созламаларга нисбатан ҳеч қандай ўзгариш мавжуд эмас.',
        );
        (error as any).code = 'NO_EFFECTIVE_CHANGES';
        (error as any).statusCode = 400;
        throw error;
      }

      // 6. Deactivate prior active version if exists in DB
      if (activeRow) {
        await this.repository.deactivateVersion(tx, districtId, activeRow.id);
      }

      // 7. Compute next monotonic version number
      const nextVersion = await this.repository.getNextVersionNumber(
        tx,
        districtId,
      );
      const newVersionId = `dcfg_${districtId}_v${nextVersion}`;

      // 8. Insert new immutable active version
      const newVersionRow = await this.repository.insertVersion(tx, {
        id: newVersionId,
        districtId,
        version: nextVersion,
        hokimRecognitionTerms: draft.hokimRecognitionTerms,
        localVocabularyAdditions: draft.localVocabularyAdditions,
        isActive: true,
        activatedAt: new Date(),
        activatedBy: actor.id,
        changeReason: payload.changeReason.trim(),
        createdAt: new Date(),
      });

      // 9. Delete draft
      await this.repository.deleteDraft(tx, districtId);

      // 10. Record audit event
      await recordAuditEvent(tx, {
        districtId,
        actorId: actor.id,
        actorRole: 'PRODUCT_OWNER',
        action: 'DISTRICT_ANALYSIS_SETTINGS_ACTIVATED',
        ipAddress: actor.ipAddress || null,
        userAgent: actor.userAgent || null,
        metadata: {
          districtId,
          districtName: district.name,
          previousVersionId: currentActiveId,
          newVersionId: newVersionRow.id,
          newVersion: nextVersion,
          changeReason: payload.changeReason.trim(),
          hokimTermsCount: (newVersionRow.hokimRecognitionTerms || []).length,
          vocabularyCount: (newVersionRow.localVocabularyAdditions || []).length,
        },
      });

      return {
        districtId,
        districtName: district.name,
        activeConfiguration: this.mapVersionToDto(newVersionRow),
        previousVersionId: currentActiveId,
        message: `${district.name}: Таҳлил созламалари муваффақиятли фаоллаштирилди. Янги версия: ${newVersionRow.id}`,
      };
    };

    return 'transaction' in db && typeof db.transaction === 'function'
      ? await db.transaction(async (tx) => executeInTx(tx))
      : await executeInTx(db);
  }
}

export const districtAnalysisSettingsService =
  new DistrictAnalysisSettingsService(districtAnalysisSettingsRepository);

