import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import PgBoss from 'pg-boss';
import * as schema from '../db/schema/index.js';

export const TELEGRAM_CONTENT_QUALIFICATION_QUEUE = 'telegram-content-qualification';
export const TELEGRAM_SEMANTIC_RELEVANCE_QUEUE = 'telegram-semantic-relevance';
export const TELEGRAM_TOPIC_ASSIGNMENT_QUEUE = 'telegram-topic-assignment';

export interface TelegramContentQualificationJobData {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  originalTimestamp: string;
}

/** Contextual data about the Telegram message this job was triggered by. */
export interface TelegramReplyMetadata {
  replyToMessageId: string;
  replyToUserId?: string;
  replyToIsForwarded: boolean;
  replyToIsBot: boolean;
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
  relevantLanes: string[];
  reasoning: string;
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
      return boss.send(queueName, data, {
        ...options,
        db: {
          executeSql: async (text: string, values?: any[]) => {
            const res = await client.query(text, values);
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
