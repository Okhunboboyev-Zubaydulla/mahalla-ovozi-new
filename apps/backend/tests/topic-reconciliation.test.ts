import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import crypto from 'node:crypto';
import type PgBoss from 'pg-boss';
import { createDbPool, createDbClient, type DbClient } from '../src/adapters/db/client.js';
import { districts, topics, topicProjections, acceptedEvidence, telegramIntakeRecords } from '../src/adapters/db/schema/index.js';
import { ensureDefaultAiProfiles } from '../src/adapters/db/seeds.js';
import {
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  JobSingletonKeys,
} from '../src/adapters/jobs/boss-client.js';
import { reconcileUnprojectedTopics } from '../src/modules/topics/topic-reconciliation-service.js';

describe('Topic Projection Self-Healing Reconciler Integration Tests', () => {
  let pool: pg.Pool;
  let db: DbClient;
  let districtId: string;

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
    await ensureDefaultAiProfiles(db);

    districtId = `dist_rec_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(districts).values({
      id: districtId,
      name: `Reconciliation District ${districtId}`,
      region: 'Тошкент шаҳри',
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('detects unprojected or lagged topics and re-enqueues them to TELEGRAM_TOPIC_PROJECTION_QUEUE', async () => {
    const unprojectedTopicId = `top_unproj_${crypto.randomUUID().slice(0, 8)}`;
    const projectedTopicId = `top_proj_${crypto.randomUUID().slice(0, 8)}`;
    const intakeId = `int_proj_${crypto.randomUUID().slice(0, 8)}`;
    const evidenceId = `evi_proj_${crypto.randomUUID().slice(0, 8)}`;
    const pastDate = new Date(Date.now() - 60000); // 60 seconds ago (past 30s cooldown)
    const futureRetention = new Date(Date.now() + 86400000);

    // 1. Insert unprojected topic (no row in topic_projections)
    await db.insert(topics).values({
      id: unprojectedTopicId,
      districtId,
      mahallaName: 'Юнусобод',
      calendarDay: '2026-09-08',
      primaryLane: 'WATER',
      status: 'ACTIVE',
      latestRelevantEvidenceTimestamp: pastDate,
      retentionExpiresAt: futureRetention,
      requiredDerivedGeneration: 1,
      appliedDerivedGeneration: 0,
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    // 2. Insert already-projected topic (with projection row up to date)
    await db.insert(topics).values({
      id: projectedTopicId,
      districtId,
      mahallaName: 'Юнусобод',
      calendarDay: '2026-09-08',
      primaryLane: 'ELECTRICITY',
      status: 'ACTIVE',
      latestRelevantEvidenceTimestamp: pastDate,
      retentionExpiresAt: futureRetention,
      requiredDerivedGeneration: 1,
      appliedDerivedGeneration: 1,
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    await db.insert(telegramIntakeRecords).values({
      id: intakeId,
      districtId,
      mahallaName: 'Юнусобод',
      telegramBotId: 'bot_test',
      telegramChatId: '-10088888',
      telegramMessageId: '54321',
      originalTimestamp: pastDate,
      calendarDay: '2026-09-08',
      rawPayload: {},
      createdAt: pastDate,
    });

    await db.insert(acceptedEvidence).values({
      id: evidenceId,
      topicId: projectedTopicId,
      districtId,
      mahallaName: 'Юнусобод',
      calendarDay: '2026-09-08',
      intakeRecordId: intakeId,
      telegramChatId: '-10088888',
      telegramMessageId: '54321',
      originalTimestamp: pastDate,
      verbatimText: 'Электр ўчди.',
      contentType: 'TEXT',
    });

    const defaultProfile = (await db.query.aiProfiles.findFirst())!;
    await db.insert(topicProjections).values({
      id: `prj_${crypto.randomUUID().slice(0, 8)}`,
      topicId: projectedTopicId,
      districtId,
      mahallaName: 'Юнусобод',
      calendarDay: '2026-09-08',
      summary: 'Маҳаллада электр таъминоти узилганлиги маълум қилинди.',
      lanes: ['ELECTRICITY'],
      primaryLane: 'ELECTRICITY',
      anchorEvidenceId: evidenceId,
      anchorQuote: 'Электр ўчди.',
      latestMeaningfulActivityTimestamp: pastDate,
      attribution: 'Маҳалла аҳолиси',
      isHokimRelated: false,
      generation: 1,
      aiProfileId: defaultProfile.id,
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    // Mock pg-boss to capture enqueued jobs
    const dispatchedJobs: Array<{ queue: string; data: any; options: any }> = [];
    const mockBoss = {
      send: async (queue: string, data: any, options: any) => {
        dispatchedJobs.push({ queue, data, options });
        return `job_${crypto.randomUUID()}`;
      },
    } as unknown as PgBoss;

    // Run reconciliation with 30-second cooldown targeted to this test district
    const result = await reconcileUnprojectedTopics(db, mockBoss, 30, districtId);

    expect(result.sweptCount).toBeGreaterThanOrEqual(1);
    expect(result.reEnqueuedCount).toBeGreaterThanOrEqual(1);
    expect(result.errorCount).toBe(0);

    const reEnqueuedJob = dispatchedJobs.find(
      (j) => j.queue === TELEGRAM_TOPIC_PROJECTION_QUEUE && j.data?.topicId === unprojectedTopicId,
    );
    expect(reEnqueuedJob).toBeDefined();
    expect(reEnqueuedJob?.data.generation).toBe(1);
    expect(reEnqueuedJob?.options?.singletonKey).toBe(
      JobSingletonKeys.forTopicProjection(unprojectedTopicId, 1),
    );

    // The already-projected topic must NOT be re-enqueued
    const alreadyProjectedJob = dispatchedJobs.find(
      (j) => j.data?.topicId === projectedTopicId,
    );
    expect(alreadyProjectedJob).toBeUndefined();
  });
});
