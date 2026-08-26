import { fileURLToPath } from 'node:url';

import path from 'node:path';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import {
  createBossClient,
  initBossQueues,
  TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
  TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  TELEGRAM_TOPIC_RETENTION_QUEUE,
} from '../adapters/jobs/boss-client.js';
import { createDbPool, createDbClient, type DbClient } from '../adapters/db/client.js';
import { ensureDefaultAiProfiles } from '../adapters/db/schema/index.js';
import { AiGateway, type AiGatewayPort } from '../modules/ai/ai-gateway.js';
import { SemanticRelevanceEvaluator } from '../modules/ai/semantic-relevance-evaluator.js';
import { TopicMatchingEvaluator } from '../modules/topics/topic-matching-evaluator.js';
import { TopicProjectionEvaluator } from '../modules/topics/topic-projection-evaluator.js';
import type { AcceptedEvidenceItem } from '../modules/ai/context-snapshot.js';

import { registerQualificationJobHandler } from '../modules/telegram-intake/jobs/qualification-job-handler.js';
import { registerSemanticRelevanceJobHandler } from '../modules/ai/jobs/semantic-relevance-job-handler.js';
import { registerTopicAssignmentJobHandler } from '../modules/topics/jobs/topic-assignment-job-handler.js';
import { registerTopicProjectionJobHandler } from '../modules/topics/jobs/topic-projection-job-handler.js';
import { registerRetentionJobHandler } from '../modules/retention/jobs/retention-job-handler.js';

let activeBossInstance: PgBoss | null = null;
let internalPool: pg.Pool | null = null;

export interface StartWorkerOptions {
  boss?: PgBoss;
  db?: DbClient;
  pool?: pg.Pool;
  aiGateway?: AiGatewayPort;
  queues?: string[];
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
}

export interface WorkerPipelineContext {
  db: DbClient;
  pool: pg.Pool;
  boss: PgBoss;
  aiGateway: AiGatewayPort;
  relevanceEvaluator: SemanticRelevanceEvaluator;
  topicMatchingEvaluator: TopicMatchingEvaluator;
  topicProjectionEvaluator: TopicProjectionEvaluator;
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
}

/**
 * Registers all durable job pipeline workers into pg-boss, conditionally filtering by active queues.
 */
export async function registerWorkerPipelines(
  boss: PgBoss,
  ctx: WorkerPipelineContext,
  activeQueues?: string[],
): Promise<void> {
  const shouldWork = (queueName: string) => !activeQueues || activeQueues.includes(queueName);

  if (shouldWork(TELEGRAM_CONTENT_QUALIFICATION_QUEUE)) {
    await registerQualificationJobHandler(boss, { db: ctx.db, boss: ctx.boss });
  }

  if (shouldWork(TELEGRAM_SEMANTIC_RELEVANCE_QUEUE)) {
    await registerSemanticRelevanceJobHandler(boss, {
      db: ctx.db,
      pool: ctx.pool,
      boss: ctx.boss,
      relevanceEvaluator: ctx.relevanceEvaluator,
      injectedEvidenceResolver: ctx.injectedEvidenceResolver,
    });
  }

  if (shouldWork(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE)) {
    await registerTopicAssignmentJobHandler(boss, {
      db: ctx.db,
      pool: ctx.pool,
      boss: ctx.boss,
      topicMatchingEvaluator: ctx.topicMatchingEvaluator,
      injectedEvidenceResolver: ctx.injectedEvidenceResolver,
    });
  }

  if (shouldWork(TELEGRAM_TOPIC_PROJECTION_QUEUE)) {
    await registerTopicProjectionJobHandler(boss, {
      db: ctx.db,
      pool: ctx.pool,
      boss: ctx.boss,
      topicProjectionEvaluator: ctx.topicProjectionEvaluator,
      injectedEvidenceResolver: ctx.injectedEvidenceResolver,
    });
  }

  if (shouldWork(TELEGRAM_TOPIC_RETENTION_QUEUE)) {
    await registerRetentionJobHandler(boss, { db: ctx.db, pool: ctx.pool, boss: ctx.boss });
  }
}

export async function startWorker(options?: StartWorkerOptions): Promise<PgBoss> {
  const boss = options?.boss || createBossClient();
  activeBossInstance = boss;

  let pool = options?.pool;
  let db = options?.db;

  if (!db) {
    if (!pool) {
      pool = createDbPool();
      internalPool = pool;
    }
    db = createDbClient(pool);
  } else if (!pool) {
    pool = createDbPool();
    internalPool = pool;
  }

  boss.on('error', (error) => {
    console.error('[worker:pg-boss] Background queue error:', error);
  });

  await boss.start();
  await initBossQueues(boss);
  await ensureDefaultAiProfiles(db);

  const aiGateway: AiGatewayPort = options?.aiGateway || new AiGateway({ db });
  const relevanceEvaluator = new SemanticRelevanceEvaluator(aiGateway);
  const topicMatchingEvaluator = new TopicMatchingEvaluator(aiGateway);
  const topicProjectionEvaluator = new TopicProjectionEvaluator(aiGateway);

  const context: WorkerPipelineContext = {
    db,
    pool,
    boss,
    aiGateway,
    relevanceEvaluator,
    topicMatchingEvaluator,
    topicProjectionEvaluator,
    injectedEvidenceResolver: options?.injectedEvidenceResolver,
  };

  await registerWorkerPipelines(boss, context, options?.queues);

  console.log('[worker] Mahalla Ovozi worker process started successfully');
  return boss;
}

export async function stopWorker(bossInstance?: PgBoss): Promise<void> {
  const boss = bossInstance || activeBossInstance;
  if (boss) {
    console.log('[worker] Stopping pg-boss worker gracefully...');
    await boss.stop({ graceful: true, timeout: 30000 });
    console.log('[worker] pg-boss worker stopped.');
    if (activeBossInstance === boss) {
      activeBossInstance = null;
    }
  }

  if (internalPool) {
    await internalPool.end();
    internalPool = null;
  }
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  startWorker().catch((err) => {
    console.error('[worker] Failed to start worker:', err);
    process.exit(1);
  });

  let isShuttingDown = false;
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[worker] Received ${signal}, initiating graceful shutdown...`);
    await stopWorker();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
