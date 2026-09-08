import type pg from 'pg';
import type PgBoss from 'pg-boss';
import type { DbClient } from '../../../adapters/db/client.js';
import {
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
  type TelegramTopicAssignmentJobData,
} from '../../../adapters/jobs/boss-client.js';
import type { TopicMatchingEvaluator } from '../topic-matching-evaluator.js';
import type { AcceptedEvidenceItem } from '../../ai/context-snapshot.js';
import {
  createTopicAssignmentCoordinator,
  type TopicAssignmentCoordinator,
} from '../topic-assignment-coordinator.js';
import { clearPendingRetryFlag } from '../../issues/retry-service.js';

export interface TopicAssignmentJobDeps {
  db: DbClient;
  pool: pg.Pool;
  boss: PgBoss;
  topicMatchingEvaluator: TopicMatchingEvaluator;
  coordinator?: TopicAssignmentCoordinator;
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
}

export async function processTopicAssignmentJobs(
  jobs: PgBoss.Job<TelegramTopicAssignmentJobData>[],
  deps: TopicAssignmentJobDeps,
): Promise<void> {
  const coordinator =
    deps.coordinator ??
    createTopicAssignmentCoordinator({
      db: deps.db,
      pool: deps.pool,
      boss: deps.boss,
      topicMatchingEvaluator: deps.topicMatchingEvaluator,
      injectedEvidenceResolver: deps.injectedEvidenceResolver,
    });

  for (const job of jobs) {
    const data = job.data;
    try {
      await coordinator.assignEvidenceToTopic({
        intakeId: data.intakeId,
        districtId: data.districtId,
        mahallaName: data.mahallaName,
        calendarDay: data.calendarDay,
        telegramChatId: data.telegramChatId,
        telegramMessageId: data.telegramMessageId,
        telegramUserId: data.telegramUserId,
        originalTimestamp: data.originalTimestamp,
        contentType: data.contentType,
        verbatimText: data.verbatimText,
        replyMetadata: data.replyMetadata,
        userMetadata: data.userMetadata,
        aiOperationId: data.aiOperationId,
        relevantLanes: data.relevantLanes,
        reasoning: data.reasoning,
        burstMessages: data.burstMessages,
        issueId: data.issueId,
      });
    } catch (err: any) {
      // Handle unique violation gracefully for duplicate replays (AC 16 / Matrix #26)
      if (
        err?.code === '23505' &&
        (String(err?.constraint).includes('accepted_evidence_district_chat_msg_idx') ||
          String(err?.detail).includes('already exists'))
      ) {
        console.log(
          JSON.stringify({
            event: 'TELEGRAM_TOPIC_ASSIGNMENT_IGNORED_DUPLICATE_VIOLATION',
            intakeId: data.intakeId,
            districtId: data.districtId,
            telegramChatId: data.telegramChatId,
            telegramMessageId: data.telegramMessageId,
          }),
        );
        continue;
      }

      console.error(
        JSON.stringify({
          event: 'TELEGRAM_TOPIC_ASSIGNMENT_ERROR',
          intakeId: data.intakeId,
          districtId: data.districtId,
          telegramChatId: data.telegramChatId,
          telegramMessageId: data.telegramMessageId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      throw err; // Trigger pg-boss durable retry policy
    } finally {
      if (data.issueId) {
        await clearPendingRetryFlag(deps.db, data.issueId);
      }
    }
  }
}

export async function registerTopicAssignmentJobHandler(
  boss: PgBoss,
  deps: TopicAssignmentJobDeps,
): Promise<void> {
  await boss.work<TelegramTopicAssignmentJobData>(
    TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
    { newJobCheckInterval: 50 } as any,
    (jobs) => processTopicAssignmentJobs(jobs, deps),
  );
}
