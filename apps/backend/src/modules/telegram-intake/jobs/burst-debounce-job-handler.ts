import crypto from 'node:crypto';
import type PgBoss from 'pg-boss';
import { eq } from 'drizzle-orm';
import type { DbClient } from '../../../adapters/db/client.js';
import {
  districts,
} from '../../../adapters/db/schema/index.js';
import {
  TELEGRAM_BURST_DEBOUNCE_QUEUE,
  TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
  JobSingletonKeys,
  sendQueueJob,
  type TelegramBurstDebounceJobData,
  type TelegramSemanticRelevanceJobData,
  type BurstMessageItem,
} from '../../../adapters/jobs/boss-client.js';
import { qualifyTelegramContent } from '../telegram-content-qualification.js';
import {
  defaultBurstBufferRepository,
  type BurstBufferRepository,
} from '../burst-buffer-repository.js';
import { clearPendingRetryFlag } from '../../issues/retry-service.js';

export interface BurstDebounceJobDeps {
  db: DbClient;
  boss: PgBoss;
  burstBufferRepo?: BurstBufferRepository;
}

export const SLIDING_DEBOUNCE_WINDOW_SECONDS = 25;
export const MAX_DEBOUNCE_BURST_CEILING_SECONDS = 60;

export async function processBurstDebounceJobs(
  jobs: PgBoss.Job<TelegramBurstDebounceJobData>[],
  deps: BurstDebounceJobDeps,
): Promise<void> {
  const { db, boss } = deps;
  const burstBufferRepo = deps.burstBufferRepo || defaultBurstBufferRepository;

  for (const job of jobs) {
    const {
      districtId,
      mahallaName,
      calendarDay,
      telegramChatId,
      telegramUserId,
      firstMessageTimestamp,
    } = job.data;
    const startTime = performance.now();

    try {
      // 1. District Lifecycle Verification
      const [district] = await db
        .select({
          id: districts.id,
          status: districts.status,
          accessEligible: districts.accessEligible,
        })
        .from(districts)
        .where(eq(districts.id, districtId))
        .limit(1);

      if (
        !district ||
        (district.status !== 'ACTIVE' && district.status !== 'GRACE') ||
        district.accessEligible === false
      ) {
        console.log(
          JSON.stringify({
            event: 'TELEGRAM_BURST_DEBOUNCE_DROPPED_INACTIVE_DISTRICT',
            districtId,
            telegramChatId,
            telegramUserId,
            districtStatus: district?.status ?? 'NOT_FOUND',
          }),
        );
        continue;
      }

      // 2. Fetch all unbatched intake records for this user in this chat
      const pendingRecords = await burstBufferRepo.getUnprocessedBurstIntakes(
        db,
        districtId,
        telegramChatId,
        telegramUserId,
      );

      if (pendingRecords.length === 0) {
        continue;
      }

      // 3. Sliding Window Evaluation
      const now = Date.now();
      const firstMsgTime = new Date(firstMessageTimestamp || pendingRecords[0]!.originalTimestamp).getTime();
      const latestRecord = pendingRecords[pendingRecords.length - 1]!;
      const latestMsgTime = new Date(latestRecord.originalTimestamp).getTime();

      const timeSinceLatest = (now - latestMsgTime) / 1000;
      const totalElapsed = (now - firstMsgTime) / 1000;

      // If user sent a message within the last 25s AND total elapsed time is under 60s -> extend timer
      if (
        timeSinceLatest < SLIDING_DEBOUNCE_WINDOW_SECONDS &&
        totalElapsed < MAX_DEBOUNCE_BURST_CEILING_SECONDS
      ) {
        const remainingDelay = Math.max(
          1,
          Math.ceil(SLIDING_DEBOUNCE_WINDOW_SECONDS - timeSinceLatest),
        );
        const singletonKey = JobSingletonKeys.forBurstDebounce(
          districtId,
          telegramChatId,
          telegramUserId,
        );

        await sendQueueJob(
          boss,
          TELEGRAM_BURST_DEBOUNCE_QUEUE,
          {
            ...job.data,
            firstMessageTimestamp: new Date(firstMsgTime).toISOString(),
          },
          {
            startAfter: remainingDelay,
            singletonKey,
          },
        );

        console.log(
          JSON.stringify({
            event: 'TELEGRAM_BURST_DEBOUNCE_RESCHEDULED',
            districtId,
            telegramChatId,
            telegramUserId,
            pendingCount: pendingRecords.length,
            remainingDelay,
            totalElapsed: Math.round(totalElapsed),
          }),
        );
        continue;
      }

      // 4. Batch Flush: Qualify eligible messages
      const supportedItems: BurstMessageItem[] = [];
      const excludedIds: string[] = [];
      let latestReplyMetadata: any = null;

      for (const rec of pendingRecords) {
        const qual = qualifyTelegramContent({
          id: rec.id,
          districtId: rec.districtId,
          mahallaName: rec.mahallaName,
          calendarDay: rec.calendarDay,
          telegramBotId: rec.telegramBotId,
          telegramChatId: rec.telegramChatId,
          telegramMessageId: rec.telegramMessageId,
          updateId: rec.updateId,
          telegramUserId: rec.telegramUserId,
          originalTimestamp: rec.originalTimestamp,
          rawPayload: rec.rawPayload,
        });

        if (qual.status === 'SUPPORTED') {
          supportedItems.push({
            intakeId: rec.id,
            telegramMessageId: rec.telegramMessageId,
            originalTimestamp: qual.candidate.originalTimestamp,
            verbatimText: qual.candidate.verbatimText,
            contentType: qual.candidate.contentType,
            replyMetadata: qual.candidate.replyMetadata,
          });
          if (qual.candidate.replyMetadata) {
            latestReplyMetadata = qual.candidate.replyMetadata;
          }
        } else {
          excludedIds.push(rec.id);
        }
      }

      const batchId = `batch_${crypto.randomUUID()}`;
      const allIntakeIds = pendingRecords.map((r) => r.id);

      // Mark all records in this burst as processed with batchId
      await burstBufferRepo.markBurstIntakesProcessed(db, allIntakeIds, batchId);

      if (supportedItems.length === 0) {
        console.log(
          JSON.stringify({
            event: 'TELEGRAM_BURST_ALL_EXCLUDED',
            districtId,
            telegramChatId,
            telegramUserId,
            count: pendingRecords.length,
          }),
        );
        continue;
      }

      // 5. Build Aggregated Candidate
      const primaryItem = supportedItems[0]!;
      const mergedText = supportedItems.map((item) => item.verbatimText).join('\n');

      const candidateData: TelegramSemanticRelevanceJobData = {
        intakeId: primaryItem.intakeId,
        districtId,
        mahallaName,
        calendarDay,
        telegramChatId,
        telegramMessageId: primaryItem.telegramMessageId,
        telegramUserId: telegramUserId || undefined,
        originalTimestamp: primaryItem.originalTimestamp,
        contentType: primaryItem.contentType,
        verbatimText: mergedText,
        replyMetadata: latestReplyMetadata,
        burstMessages: supportedItems.length > 1 ? supportedItems : undefined,
      };

      const singletonKey = JobSingletonKeys.forSemanticRelevance(
        districtId,
        telegramChatId,
        primaryItem.telegramMessageId,
      );

      await sendQueueJob(boss, TELEGRAM_SEMANTIC_RELEVANCE_QUEUE, candidateData, {
        singletonKey,
      });

      const durationMs = Math.round(performance.now() - startTime);
      console.log(
        JSON.stringify({
          event: 'TELEGRAM_BURST_DEBOUNCE_COMMITTED',
          districtId,
          mahallaName,
          telegramChatId,
          telegramUserId,
          batchId,
          totalMessages: pendingRecords.length,
          supportedMessages: supportedItems.length,
          mergedLength: mergedText.length,
          durationMs,
        }),
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'TELEGRAM_BURST_DEBOUNCE_ERROR',
          districtId,
          telegramChatId,
          telegramUserId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      throw err;
    } finally {
      if (job.data?.issueId) {
        await clearPendingRetryFlag(db, job.data.issueId);
      }
    }
  }
}

export async function registerBurstDebounceJobHandler(
  boss: PgBoss,
  deps: BurstDebounceJobDeps,
): Promise<void> {
  await boss.work<TelegramBurstDebounceJobData>(
    TELEGRAM_BURST_DEBOUNCE_QUEUE,
    { newJobCheckInterval: 50 } as any,
    (jobs) => processBurstDebounceJobs(jobs, deps),
  );
}
