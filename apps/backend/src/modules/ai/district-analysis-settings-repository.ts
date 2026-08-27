import { eq, and, desc } from 'drizzle-orm';
import type { DbOrTx } from '../../adapters/db/client.js';
import {
  districtAnalysisSettingsVersions,
  districtAnalysisSettingsDrafts,
  type DistrictAnalysisSettingsVersion,
  type NewDistrictAnalysisSettingsDraft,
  type DistrictAnalysisSettingsDraft,
} from '../../adapters/db/schema/index.js';

export interface DistrictAnalysisSettingsRepositoryPort {
  getActiveConfiguration(
    db: DbOrTx,
    districtId: string,
  ): Promise<DistrictAnalysisSettingsVersion | null>;
  getDraft(
    db: DbOrTx,
    districtId: string,
  ): Promise<DistrictAnalysisSettingsDraft | null>;
  saveDraft(
    db: DbOrTx,
    draft: NewDistrictAnalysisSettingsDraft,
  ): Promise<DistrictAnalysisSettingsDraft>;
}

export class DrizzleDistrictAnalysisSettingsRepository
  implements DistrictAnalysisSettingsRepositoryPort
{
  async getActiveConfiguration(
    db: DbOrTx,
    districtId: string,
  ): Promise<DistrictAnalysisSettingsVersion | null> {
    const [row] = await db
      .select()
      .from(districtAnalysisSettingsVersions)
      .where(
        and(
          eq(districtAnalysisSettingsVersions.districtId, districtId),
          eq(districtAnalysisSettingsVersions.isActive, true),
        ),
      )
      .orderBy(desc(districtAnalysisSettingsVersions.version))
      .limit(1);

    return row || null;
  }

  async getDraft(
    db: DbOrTx,
    districtId: string,
  ): Promise<DistrictAnalysisSettingsDraft | null> {
    const [row] = await db
      .select()
      .from(districtAnalysisSettingsDrafts)
      .where(eq(districtAnalysisSettingsDrafts.districtId, districtId))
      .limit(1);

    return row || null;
  }

  async saveDraft(
    db: DbOrTx,
    draft: NewDistrictAnalysisSettingsDraft,
  ): Promise<DistrictAnalysisSettingsDraft> {
    const [saved] = await db
      .insert(districtAnalysisSettingsDrafts)
      .values(draft)
      .onConflictDoUpdate({
        target: districtAnalysisSettingsDrafts.districtId,
        set: {
          baseActiveVersionId: draft.baseActiveVersionId,
          hokimRecognitionTerms: draft.hokimRecognitionTerms,
          localVocabularyAdditions: draft.localVocabularyAdditions,
          updatedBy: draft.updatedBy,
          updatedAt: draft.updatedAt ?? new Date(),
        },
      })
      .returning();

    if (!saved) {
      throw new Error('Туман созламалари қораламасини сақлашда хатолик юз берди.');
    }

    return saved;
  }
}

export const districtAnalysisSettingsRepository =
  new DrizzleDistrictAnalysisSettingsRepository();
