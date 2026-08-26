import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import PgBoss from 'pg-boss';
import * as schema from '../db/schema/index.js';
import type {
  QualifyingLane,
  TelegramReplyMetadata,
} from '@mahalla-ovozi/api-contracts';
export type { TelegramReplyMetadata };

export const TELEGRAM_CONTENT_QUALIFICATION_QUEUE = 'telegram-content-qualification';
export const TELEGRAM_SEMANTIC_RELEVANCE_QUEUE = 'telegram-semantic-relevance';
export const TELEGRAM_TOPIC_ASSIGNMENT_QUEUE = 'telegram-topic-assignment';
export const TELEGRAM_TOPIC_PROJECTION_QUEUE = 'telegram-topic-projection';
export const TELEGRAM_TOPIC_RETENTION_QUEUE = 'telegram-topic-retention';

export interface TelegramContentQualificationJobData {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  originalTimestamp: string;
  issueId?: string;
}

export interface TelegramSemanticRelevanceJobData {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  telegramUserId?: string;
  originalTimestamp: string; // ISO-8601 string
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  verbatimText: string;
  replyMetadata: TelegramReplyMetadata | null;
  issueId?: string;
}

export interface TelegramTopicAssignmentJobData {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  telegramUserId?: string;
  originalTimestamp: string; // ISO-8601 string
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  verbatimText: string;
  replyMetadata: TelegramReplyMetadata | null;
  aiOperationId: string;
  relevantLanes: QualifyingLane[];
  reasoning: string;
  issueId?: string;
}

export interface TelegramTopicProjectionJobData {
  topicId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  generation: number;
  issueId?: string;
}

export interface TelegramTopicRetentionJobData {
  districtId?: string;
  issueId?: string;
}

export function createBossClient(options?: { connectionString?: string; schema?: string }): PgBoss {
  const connectionString =
    options?.connectionString ||
    process.env.DATABASE_URL ||
    'postgresql://mahalla_user:mahalla_dev_password@localhost:5433/mahalla_ovozi';

  return new PgBoss({
    connectionString,
    schema: options?.schema || 'pgboss',
    max: 10,
  });
}

/**
 * Ensures all required pg-boss queues exist in pgboss.queue.
 * Mandatory in pg-boss 10.x before sending or working on queues.
 * This operation is idempotent.
 */
export async function initBossQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(TELEGRAM_CONTENT_QUALIFICATION_QUEUE);
  await boss.createQueue(TELEGRAM_SEMANTIC_RELEVANCE_QUEUE);
  await boss.createQueue(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE);
  await boss.createQueue(TELEGRAM_TOPIC_PROJECTION_QUEUE);
  await boss.createQueue(TELEGRAM_TOPIC_RETENTION_QUEUE);
}

/**
 * Standard singleton key generators for pg-boss deduplication and ordering.
 */
export const JobSingletonKeys = {
  /**
   * Deduplication key for Telegram message intake qualification.
   */
  forContentQualification(districtId: string, chatId: string, messageId: string): string {
    return `msg:${districtId}:${chatId}:${messageId}`;
  },

  /**
   * Deduplication key for Semantic Relevance AI evaluation.
   */
  forSemanticRelevance(districtId: string, chatId: string, messageId: string): string {
    return `rel:${districtId}:${chatId}:${messageId}`;
  },

  /**
   * Deduplication key for Topic Assignment AI evaluation.
   */
  forTopicAssignment(districtId: string, chatId: string, messageId: string): string {
    return `topic:${districtId}:${chatId}:${messageId}`;
  },

  /**
   * Coalescing key for Topic Projection AI recalculation (AD-7).
   */
  forTopicProjection(topicId: string, generation: number): string {
    return `proj:${topicId}:${generation}`;
  },

  /**
   * Ordering serialization key for same-day Mahalla civic signal ordering (AD-3).
   */
  forDistrictMahallaDay(districtId: string, mahallaName: string, calendarDay: string): string {
    return `scope:${districtId}:${mahallaName.trim().toLowerCase()}:${calendarDay}`;
  },

  /**
   * Deduplication key for Global or District retention scans (Story 4.3 Task 3).
   */
  forRetention(districtId?: string): string {
    return `retention:${districtId || 'global'}`;
  },
};

export const DEFAULT_QUEUE_CONFIGS: Record<string, Omit<PgBoss.SendOptions, 'db'>> = {
  [TELEGRAM_CONTENT_QUALIFICATION_QUEUE]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInMinutes: 10,
    retentionDays: 7,
  },
  [TELEGRAM_SEMANTIC_RELEVANCE_QUEUE]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInMinutes: 10,
    retentionDays: 7,
  },
  [TELEGRAM_TOPIC_ASSIGNMENT_QUEUE]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInMinutes: 10,
    retentionDays: 7,
  },
  [TELEGRAM_TOPIC_PROJECTION_QUEUE]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInMinutes: 10,
    retentionDays: 7,
  },
  [TELEGRAM_TOPIC_RETENTION_QUEUE]: {
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: false,
    expireInMinutes: 30,
    retentionDays: 14,
  },
};

/**
 * Sends a job to a pg-boss queue with default resilient retry/retention options automatically applied.
 */
export async function sendQueueJob<T extends object>(
  boss: PgBoss,
  queueName: string,
  data: T,
  options?: PgBoss.SendOptions,
): Promise<string | null> {
  const defaultOpts = DEFAULT_QUEUE_CONFIGS[queueName] || {};
  const mergedOptions: PgBoss.SendOptions = {
    ...defaultOpts,
    ...options,
  };
  return boss.send(queueName, data, mergedOptions);
}

export interface TransactionScope {
  tx: NodePgDatabase<typeof schema>;
  client: pg.PoolClient;
  enqueueJob: <T extends object>(
    queueName: string,
    data: T,
    options?: Omit<PgBoss.SendOptions, 'db'>,
  ) => Promise<string | null>;
}

/**
 * Executes database operations and pg-boss job dispatch atomically within a single
 * PostgreSQL transaction block (BEGIN ... COMMIT). If either the database operations
 * or the pg-boss enqueue fail, the entire transaction is rolled back.
 */
export async function withTransactionalIntake<T>(
  pool: pg.Pool,
  boss: PgBoss,
  callback: (scope: TransactionScope) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let rollbackError: unknown = null;
  try {
    await client.query('BEGIN');
    const tx = drizzle(client, { schema });

    const enqueueJob = async <J extends object>(
      queueName: string,
      data: J,
      options?: Omit<PgBoss.SendOptions, 'db'>,
    ): Promise<string | null> => {
      const defaultOpts = DEFAULT_QUEUE_CONFIGS[queueName] || {};
      return boss.send(queueName, data, {
        ...defaultOpts,
        ...options,
        db: {
          executeSql: async (text: string, values?: unknown[]) => {
            const res = await client.query(text, values as any[]);
            return {
              rows: res.rows,
              rowCount: res.rowCount ?? 0,
            };
          },
        },
      });
    };

    const result = await callback({ tx, client, enqueueJob });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      rollbackError = rbErr;
    }
    throw error;
  } finally {
    client.release(rollbackError ? true : undefined);
  }
}
