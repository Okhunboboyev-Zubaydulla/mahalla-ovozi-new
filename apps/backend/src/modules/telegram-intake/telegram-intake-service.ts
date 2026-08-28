import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq } from 'drizzle-orm';
import type { DbClient } from '../../adapters/db/client.js';
import { createDbClient } from '../../adapters/db/client.js';
import {
  districts,
  districtTelegramBots,
  districtTelegramGroups,
  telegramIntakeRecords,
} from '../../adapters/db/schema/index.js';
import {
  withTransactionalIntake,
  TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
  JobSingletonKeys,
} from '../../adapters/jobs/boss-client.js';
import { getTashkentCalendarDay } from './timezone-util.js';

export interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id?: number;
    date?: number; // unix timestamp in seconds
    chat?: {
      id?: number | string;
      title?: string;
      type?: string;
    };
    from?: {
      id?: number | string;
      is_bot?: boolean;
      first_name?: string;
      username?: string;
    };
    text?: string;
    caption?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type AuthorizationFailureReason =
  | 'BOT_NOT_FOUND'
  | 'BOT_NOT_VALID'
  | 'DISTRICT_NOT_ACTIVE'
  | 'GROUP_NOT_APPROVED'
  | 'CROSS_DISTRICT_MISMATCH';

export type AuthorizationResult =
  | {
      authorized: true;
      districtId: string;
      mahallaName: string;
      botId: string;
    }
  | {
      authorized: false;
      reason: AuthorizationFailureReason;
    };

export type ProcessWebhookResult =
  | {
      status: 'ACCEPTED';
      intakeId: string;
      jobId: string | null;
      districtId: string;
      mahallaName: string;
      chatId: string;
      messageId: string;
    }
  | {
      status: 'DROPPED';
      reason: string;
      chatId?: string;
      messageId?: string;
    }
  | {
      status: 'DUPLICATE';
      intakeId: null;
      jobId: null;
      districtId: string;
      mahallaName: string;
      chatId: string;
      messageId: string;
    };

/**
 * Authoritatively resolves the District identity and Mahalla mapping from server-side database
 * records based on the incoming botId and chatId. Client-supplied IDs are never trusted.
 */
export async function resolveDistrictBotAndGroup(
  db: DbClient,
  botId: string,
  chatId: string,
): Promise<AuthorizationResult> {
  // 1. Look up bot by public botId
  const [bot] = await db
    .select()
    .from(districtTelegramBots)
    .where(eq(districtTelegramBots.botId, botId))
    .limit(1);

  if (!bot) {
    return { authorized: false, reason: 'BOT_NOT_FOUND' };
  }

  // 1.1 Verify bot is in VALID status
  if (bot.status !== 'VALID') {
    return { authorized: false, reason: 'BOT_NOT_VALID' };
  }

  // 2. Authoritatively verify associated District is in ACTIVE status
  const [district] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, bot.districtId))
    .limit(1);

  if (
    !district ||
    (district.status !== 'ACTIVE' && district.status !== 'GRACE') ||
    district.accessEligible === false
  ) {
    return { authorized: false, reason: 'DISTRICT_NOT_ACTIVE' };
  }

  // 3. Look up source group mapping by telegramChatId
  const [group] = await db
    .select()
    .from(districtTelegramGroups)
    .where(eq(districtTelegramGroups.telegramChatId, chatId))
    .limit(1);

  if (!group) {
    return { authorized: false, reason: 'GROUP_NOT_APPROVED' };
  }

  // 4. Verify group belongs to the exact same District as the bot
  if (group.districtId !== bot.districtId) {
    return { authorized: false, reason: 'CROSS_DISTRICT_MISMATCH' };
  }

  // 5. Verify group is in VALID approved status
  if (group.status !== 'VALID') {
    return { authorized: false, reason: 'GROUP_NOT_APPROVED' };
  }

  return {
    authorized: true,
    districtId: district.id,
    mahallaName: group.mahallaName,
    botId: bot.botId,
  };
}

/**
 * Handles incoming Telegram webhook update:
 * 1. Structural update type guards (drops non-message payloads with 200 OK)
 * 2. Multi-tenant authorization check
 * 3. Atomic PostgreSQL transaction:
 *    - Inserts raw intake record (.onConflictDoNothing().returning())
 *    - Resolves duplicates idempotently without throwing
 *    - Enqueues pg-boss qualification job with deduplication singletonKey
 */
export async function processTelegramWebhookUpdate(
  pool: pg.Pool,
  boss: PgBoss,
  botId: string,
  update: TelegramUpdate,
): Promise<ProcessWebhookResult> {
  // Structural Guard: only process updates containing a valid message with chat.id and message_id
  if (
    !update ||
    typeof update !== 'object' ||
    !update.message ||
    typeof update.message !== 'object' ||
    update.message.chat?.id === undefined ||
    update.message.chat?.id === null ||
    update.message.message_id === undefined ||
    update.message.message_id === null
  ) {
    return {
      status: 'DROPPED',
      reason: 'UNSUPPORTED_UPDATE_TYPE',
    };
  }

  const chatId = String(update.message.chat.id);
  const messageId = String(update.message.message_id);
  const updateId =
    update.update_id != null ? String(update.update_id) : null;
  const userId =
    update.message.from?.id != null ? String(update.message.from.id) : null;

  const db = createDbClient(pool);
  const auth = await resolveDistrictBotAndGroup(db, botId, chatId);

  if (!auth.authorized) {
    return {
      status: 'DROPPED',
      reason: auth.reason,
      chatId,
      messageId,
    };
  }

  const rawDate = update.message.date;
  const unixSeconds =
    typeof rawDate === 'number' && Number.isFinite(rawDate) && rawDate > 0
      ? (rawDate > 1e11 ? Math.floor(rawDate / 1000) : Math.floor(rawDate))
      : Math.floor(Date.now() / 1000);
  const originalTimestamp = new Date(unixSeconds * 1000);
  const calendarDay = getTashkentCalendarDay(unixSeconds);

  return withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
    const intakeId = crypto.randomUUID();

    const insertedRows = await tx
      .insert(telegramIntakeRecords)
      .values({
        id: intakeId,
        districtId: auth.districtId,
        mahallaName: auth.mahallaName,
        telegramBotId: auth.botId,
        telegramChatId: chatId,
        telegramMessageId: messageId,
        updateId,
        telegramUserId: userId,
        originalTimestamp,
        calendarDay,
        rawPayload: update,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [
          telegramIntakeRecords.districtId,
          telegramIntakeRecords.telegramChatId,
          telegramIntakeRecords.telegramMessageId,
        ],
      })
      .returning();

    const record = insertedRows?.[0];

    // Duplicate detection: If onConflictDoNothing returned 0 rows, intake was already recorded
    if (!record) {
      return {
        status: 'DUPLICATE',
        intakeId: null,
        jobId: null,
        districtId: auth.districtId,
        mahallaName: auth.mahallaName,
        chatId,
        messageId,
      };
    }

    // Enqueue downstream content qualification job with scoped deduplication singleton key
    const singletonKey = JobSingletonKeys.forContentQualification(auth.districtId, chatId, messageId);
    const jobId = await enqueueJob(
      TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
      {
        intakeId: record.id,
        districtId: auth.districtId,
        mahallaName: auth.mahallaName,
        calendarDay: record.calendarDay,
        telegramChatId: record.telegramChatId,
        telegramMessageId: record.telegramMessageId,
        originalTimestamp: record.originalTimestamp.toISOString(),
      },
      {
        singletonKey,
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
      },
    );

    return {
      status: 'ACCEPTED',
      intakeId: record.id,
      jobId,
      districtId: auth.districtId,
      mahallaName: auth.mahallaName,
      chatId,
      messageId,
    };
  });
}
