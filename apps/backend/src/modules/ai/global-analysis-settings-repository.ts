import { eq } from 'drizzle-orm';
import type { DbOrTx } from '../../adapters/db/client.js';
import {
  globalAnalysisSettingsVersions,
  globalAnalysisSettingsDrafts,
  type GlobalAnalysisSettingsVersion,
  type NewGlobalAnalysisSettingsDraft,
  type GlobalAnalysisSettingsDraft,
} from '../../adapters/db/schema/index.js';

export interface GlobalAnalysisSettingsRepositoryPort {
  getActiveConfiguration(
    db: DbOrTx,
  ): Promise<GlobalAnalysisSettingsVersion | null>;
  getDraft(db: DbOrTx): Promise<GlobalAnalysisSettingsDraft | null>;
  saveDraft(
    db: DbOrTx,
    draft: NewGlobalAnalysisSettingsDraft,
  ): Promise<GlobalAnalysisSettingsDraft>;
}

export class DrizzleGlobalAnalysisSettingsRepository
  implements GlobalAnalysisSettingsRepositoryPort
{
  async getActiveConfiguration(
    db: DbOrTx,
  ): Promise<GlobalAnalysisSettingsVersion | null> {
    const [row] = await db
      .select()
      .from(globalAnalysisSettingsVersions)
      .where(eq(globalAnalysisSettingsVersions.isActive, true))
      .limit(1);

    return row || null;
  }

  async getDraft(db: DbOrTx): Promise<GlobalAnalysisSettingsDraft | null> {
    const [row] = await db
      .select()
      .from(globalAnalysisSettingsDrafts)
      .where(eq(globalAnalysisSettingsDrafts.id, 'global'))
      .limit(1);

    return row || null;
  }

  async saveDraft(
    db: DbOrTx,
    draft: NewGlobalAnalysisSettingsDraft,
  ): Promise<GlobalAnalysisSettingsDraft> {
    const [saved] = await db
      .insert(globalAnalysisSettingsDrafts)
      .values(draft)
      .onConflictDoUpdate({
        target: globalAnalysisSettingsDrafts.id,
        set: {
          baseActiveVersionId: draft.baseActiveVersionId,
          modelProvider: draft.modelProvider,
          modelId: draft.modelId,
          temperature: draft.temperature,
          maxOutputTokens: draft.maxOutputTokens,
          relevanceSystemPrompt: draft.relevanceSystemPrompt,
          topicMatchingSystemPrompt: draft.topicMatchingSystemPrompt,
          topicProjectionSystemPrompt: draft.topicProjectionSystemPrompt,
          globalServiceVocabulary: draft.globalServiceVocabulary,
          updatedBy: draft.updatedBy,
          updatedAt: draft.updatedAt ?? new Date(),
        },
      })
      .returning();

    if (!saved) {
      throw new Error('Глобал созламалар қораламасини сақлашда хатолик юз берди.');
    }

    return saved;
  }
}

export const globalAnalysisSettingsRepository =
  new DrizzleGlobalAnalysisSettingsRepository();
