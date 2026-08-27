import { eq, desc, sql } from 'drizzle-orm';
import type { DbOrTx } from '../../adapters/db/client.js';
import {
  globalAnalysisSettingsVersions,
  globalAnalysisSettingsDrafts,
  type GlobalAnalysisSettingsVersion,
  type NewGlobalAnalysisSettingsVersion,
  type NewGlobalAnalysisSettingsDraft,
  type GlobalAnalysisSettingsDraft,
} from '../../adapters/db/schema/index.js';

export interface GlobalAnalysisSettingsRepositoryPort {
  getActiveConfiguration(
    db: DbOrTx,
  ): Promise<GlobalAnalysisSettingsVersion | null>;
  getActiveConfigurationForUpdate(
    tx: DbOrTx,
  ): Promise<GlobalAnalysisSettingsVersion | null>;
  getDraft(db: DbOrTx): Promise<GlobalAnalysisSettingsDraft | null>;
  saveDraft(
    db: DbOrTx,
    draft: NewGlobalAnalysisSettingsDraft,
  ): Promise<GlobalAnalysisSettingsDraft>;
  deactivateVersion(tx: DbOrTx, id: string): Promise<void>;
  getNextVersionNumber(tx: DbOrTx): Promise<number>;
  insertVersion(
    tx: DbOrTx,
    version: NewGlobalAnalysisSettingsVersion,
  ): Promise<GlobalAnalysisSettingsVersion>;
  deleteDraft(tx: DbOrTx): Promise<void>;
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
      .orderBy(desc(globalAnalysisSettingsVersions.version))
      .limit(1);

    return row || null;
  }

  async getActiveConfigurationForUpdate(
    tx: DbOrTx,
  ): Promise<GlobalAnalysisSettingsVersion | null> {
    const [row] = await tx
      .select()
      .from(globalAnalysisSettingsVersions)
      .where(eq(globalAnalysisSettingsVersions.isActive, true))
      .orderBy(desc(globalAnalysisSettingsVersions.version))
      .limit(1)
      .for('update');

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

  async deactivateVersion(tx: DbOrTx, id: string): Promise<void> {
    await tx
      .update(globalAnalysisSettingsVersions)
      .set({ isActive: false })
      .where(eq(globalAnalysisSettingsVersions.id, id));
  }

  async getNextVersionNumber(tx: DbOrTx): Promise<number> {
    const [maxRow] = await tx
      .select({
        maxVersion: sql<number>`COALESCE(MAX(${globalAnalysisSettingsVersions.version}), 0)`,
      })
      .from(globalAnalysisSettingsVersions);

    return (Number(maxRow?.maxVersion) || 0) + 1;
  }

  async insertVersion(
    tx: DbOrTx,
    version: NewGlobalAnalysisSettingsVersion,
  ): Promise<GlobalAnalysisSettingsVersion> {
    const [saved] = await tx
      .insert(globalAnalysisSettingsVersions)
      .values(version)
      .returning();

    if (!saved) {
      throw new Error(
        'Глобал созламалар янги версиясини сақлашда хатолик юз берди.',
      );
    }

    return saved;
  }

  async deleteDraft(tx: DbOrTx): Promise<void> {
    await tx
      .delete(globalAnalysisSettingsDrafts)
      .where(eq(globalAnalysisSettingsDrafts.id, 'global'));
  }
}

export const globalAnalysisSettingsRepository =
  new DrizzleGlobalAnalysisSettingsRepository();

