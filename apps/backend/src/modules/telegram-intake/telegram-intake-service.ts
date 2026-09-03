import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq, and } from 'drizzle-orm';
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
  sendQueueJob,
  TELEGRAM_BURST_DEBOUNCE_QUEUE,
  TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
  JobSingletonKeys,
} from '../../adapters/jobs/boss-client.js';
import { qualifyTelegramContent } from './telegram-content-qualification.js';
import { getTashkentCalendarDay } from './timezone-util.js';

import type { TelegramUpdate, TelegramMessage } from '../../adapters/telegram/telegram-types.js';
export type { TelegramUpdate };

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
      status: 'UPDATED';
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
  // Consolidated 1-round-trip relational query (H-1 performance optimization)
  const [record] = await db
    .select({
      botId: districtTelegramBots.botId,
      botDistrictId: districtTelegramBots.districtId,
      botStatus: districtTelegramBots.status,
      districtId: districts.id,
      districtStatus: districts.status,
      districtAccessEligible: districts.accessEligible,
      groupId: districtTelegramGroups.id,
      groupDistrictId: districtTelegramGroups.districtId,
      groupStatus: districtTelegramGroups.status,
      mahallaName: districtTelegramGroups.mahallaName,
    })
    .from(districtTelegramBots)
    .leftJoin(districts, eq(districts.id, districtTelegramBots.districtId))
    .leftJoin(
      districtTelegramGroups,
      eq(districtTelegramGroups.telegramChatId, chatId),
    )
    .where(eq(districtTelegramBots.botId, botId))
    .limit(1);

  // 1. Look up bot by public botId
  if (!record) {
    return { authorized: false, reason: 'BOT_NOT_FOUND' };
  }

  // 1.1 Verify bot is in VALID status
  if (record.botStatus !== 'VALID') {
    return { authorized: false, reason: 'BOT_NOT_VALID' };
  }

  // 2. Authoritatively verify associated District is in ACTIVE status
  if (
    !record.districtId ||
    (record.districtStatus !== 'ACTIVE' && record.districtStatus !== 'GRACE') ||
    record.districtAccessEligible === false
  ) {
    return { authorized: false, reason: 'DISTRICT_NOT_ACTIVE' };
  }

  // 3. Look up source group mapping by telegramChatId
  if (!record.groupId || !record.mahallaName) {
    return { authorized: false, reason: 'GROUP_NOT_APPROVED' };
  }

  // 4. Verify group belongs to the exact same District as the bot
  if (record.groupDistrictId !== record.botDistrictId) {
    return { authorized: false, reason: 'CROSS_DISTRICT_MISMATCH' };
  }

  // 5. Verify group is in VALID approved status
  if (record.groupStatus !== 'VALID') {
    return { authorized: false, reason: 'GROUP_NOT_APPROVED' };
  }

  return {
    authorized: true,
    districtId: record.districtId,
    mahallaName: record.mahallaName,
    botId: record.botId,
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
  const isEdit = Boolean(update.edited_message || update.edited_channel_post);
  const rawMsg = (update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post) as TelegramMessage | undefined;

  // Structural Guard: only process updates containing a valid message with chat.id and message_id
  if (
    !update ||
    typeof update !== 'object' ||
    !rawMsg ||
    typeof rawMsg !== 'object' ||
    rawMsg.chat?.id === undefined ||
    rawMsg.chat?.id === null ||
    rawMsg.message_id === undefined ||
    rawMsg.message_id === null
  ) {
    return {
      status: 'DROPPED',
      reason: 'UNSUPPORTED_UPDATE_TYPE',
    };
  }

  const chatId = String(rawMsg.chat.id);
  const messageId = String(rawMsg.message_id);
  const updateId =
    update.update_id != null ? String(update.update_id) : null;
  const userId =
    rawMsg.from?.id != null ? String(rawMsg.from.id) : null;

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

  if (isEdit) {
    const [existing] = await db
      .select({
        id: telegramIntakeRecords.id,
        processedAt: telegramIntakeRecords.processedAt,
        calendarDay: telegramIntakeRecords.calendarDay,
        originalTimestamp: telegramIntakeRecords.originalTimestamp,
      })
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.districtId, auth.districtId),
          eq(telegramIntakeRecords.telegramChatId, chatId),
          eq(telegramIntakeRecords.telegramMessageId, messageId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.processedAt) {
        // Already processed through debounce into AI pipeline -> ignore post-AI edit (Decision 1 & 2)
        return {
          status: 'DROPPED',
          reason: 'ALREADY_PROCESSED',
          chatId,
          messageId,
        };
      }

      // In-buffer edit (Decision 2 & 3): update raw_payload in place with latest edit
      await db
        .update(telegramIntakeRecords)
        .set({
          rawPayload: update,
          updatedAt: new Date(),
        })
        .where(eq(telegramIntakeRecords.id, existing.id));

      // Reschedule / extend the debounce timer (Decision 2 Option A)
      let jobId: string | null = null;
      if (userId) {
        const singletonKey = JobSingletonKeys.forBurstDebounce(auth.districtId, chatId, userId);
        jobId = await sendQueueJob(
          boss,
          TELEGRAM_BURST_DEBOUNCE_QUEUE,
          {
            districtId: auth.districtId,
            mahallaName: auth.mahallaName,
            calendarDay: existing.calendarDay,
            telegramChatId: chatId,
            telegramUserId: userId,
            telegramBotId: auth.botId,
            firstMessageTimestamp: existing.originalTimestamp.toISOString(),
          },
          {
            singletonKey,
            startAfter: 25,
            retryLimit: 3,
            retryDelay: 5,
            retryBackoff: true,
          },
        );
      }

      return {
        status: 'UPDATED',
        intakeId: existing.id,
        jobId,
        districtId: auth.districtId,
        mahallaName: auth.mahallaName,
        chatId,
        messageId,
      };
    }
    // If not existing: fall through to insert as a new message (Decision 5 Option A)
  }

  const rawDate = rawMsg.date;
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

    // Structural pre-check for debouncing vs direct exclusion
    const qualResult = qualifyTelegramContent({
      id: record.id,
      districtId: auth.districtId,
      mahallaName: auth.mahallaName,
      calendarDay: record.calendarDay,
      telegramBotId: auth.botId,
      telegramChatId: chatId,
      telegramMessageId: messageId,
      updateId,
      telegramUserId: userId,
      originalTimestamp: record.originalTimestamp,
      rawPayload: update,
    });

    let jobId: string | null = null;
    if (qualResult.status === 'SUPPORTED') {
      // Schedule burst debouncing (25 seconds sliding window)
      const singletonKey = JobSingletonKeys.forBurstDebounce(auth.districtId, chatId, userId);
      jobId = await enqueueJob(
        TELEGRAM_BURST_DEBOUNCE_QUEUE,
        {
          districtId: auth.districtId,
          mahallaName: auth.mahallaName,
          calendarDay: record.calendarDay,
          telegramChatId: record.telegramChatId,
          telegramUserId: record.telegramUserId,
          telegramBotId: auth.botId,
          firstMessageTimestamp: record.originalTimestamp.toISOString(),
        },
        {
          singletonKey,
          startAfter: 25,
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
        },
      );
    } else {
      // Enqueue standard qualification job to log structural exclusion cleanly
      const singletonKey = JobSingletonKeys.forContentQualification(auth.districtId, chatId, messageId);
      jobId = await enqueueJob(
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
    }

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
