import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq } from 'drizzle-orm';
import {
  IssueCategory,
  RetryOperationRequest,
  RetryOperationResponse,
  RetryErrorCode,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import {
  operationalIssues,
  auditEvents,
} from '../../adapters/db/schema/index.js';
import {
  withTransactionalIntake,
  TELEGRAM_TOPIC_RETENTION_QUEUE,
  JobSingletonKeys,
} from '../../adapters/jobs/boss-client.js';
import {
  isIssueRetryEligible,
  deriveRetryJobSpec,
} from './retry-evaluator.js';

export class OperationalIssueNotFoundError extends Error {
  statusCode = 404;
  code: RetryErrorCode = 'OPERATION_NOT_FOUND';
  constructor(message = 'Сўралган техник муаммо топилмади.') {
    super(message);
    this.name = 'OperationalIssueNotFoundError';
  }
}

export class DuplicateRetryInProgressError extends Error {
  statusCode = 409;
  code: RetryErrorCode = 'DUPLICATE_RETRY_IN_PROGRESS';
  constructor(
    message = 'Ушбу муаммо учун қайта ижро этиш жараёни аллақачон навбатда.',
    code: RetryErrorCode = 'DUPLICATE_RETRY_IN_PROGRESS',
  ) {
    super(message);
    this.code = code;
    this.name = 'DuplicateRetryInProgressError';
  }
}

export class OperationIneligibleError extends Error {
  statusCode = 422;
  code: RetryErrorCode = 'OPERATION_INELIGIBLE';
  constructor(
    message = 'Ушбу муаммо тоифаси қайта уриниш орқали ҳал қилинмайди.',
    code: RetryErrorCode = 'OPERATION_INELIGIBLE',
  ) {
    super(message);
    this.code = code;
    this.name = 'OperationIneligibleError';
  }
}

export interface ActorInfo {
  id: string;
  role: string;
}

export interface RetryIssueOptions {
  reason?: string;
}

export const retryService = {
  /**
   * Triggers manual retry for an operational issue inside an atomic transaction (Story 4.3 AC 2, AC 3, AC 8, AC 9).
   */
  async retryOperationalIssue(
    pool: pg.Pool,
    boss: PgBoss,
    issueId: string,
    actor: ActorInfo,
    options: RetryIssueOptions = {},
  ): Promise<RetryOperationResponse> {
    return await withTransactionalIntake(
      pool,
      boss,
      async ({ tx, enqueueJob }) => {
        const now = new Date();

        // 1. Select issue with row locking
        const [issue] = await tx
          .select()
          .from(operationalIssues)
          .where(eq(operationalIssues.id, issueId))
          .for('update');

        if (!issue) {
          throw new OperationalIssueNotFoundError();
        }

        // 2. Validate issue status is ACTIVE (409 Conflict if already completed)
        if (issue.status !== 'ACTIVE') {
          throw new DuplicateRetryInProgressError(
            'Бартараф этилган муаммони қайта ижро этиб бўлмайди.',
            'OPERATION_ALREADY_COMPLETED',
          );
        }

        // 3. Validate category eligibility
        if (
          !isIssueRetryEligible(
            issue.issueCategory as IssueCategory,
            issue.metadata,
          )
        ) {
          throw new OperationIneligibleError(
            'Ушбу муаммо тоифаси қайта уриниш орқали ҳал қилинмайди.',
            'OPERATION_INELIGIBLE',
          );
        }

        // 4. Validate no active pending retry
        if (issue.metadata?.pendingRetry === true) {
          throw new DuplicateRetryInProgressError(
            'Ушбу муаммо учун қайта ижро этиш жараёни аллақачон навбатда.',
            'DUPLICATE_RETRY_IN_PROGRESS',
          );
        }

        // 5. Derive job spec
        const jobSpec = deriveRetryJobSpec(issue);
        if (!jobSpec) {
          throw new OperationIneligibleError(
            'Ушбу муаммо учун қайта ишга тушириш конфигурацияси топилмади.',
            'OPERATION_INELIGIBLE',
          );
        }

        // 6. Dispatch job to pg-boss with deduplicating singleton key
        const jobId = await enqueueJob(jobSpec.queueName, jobSpec.payload, {
          singletonKey: jobSpec.singletonKey,
          singletonSeconds: 300,
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
        });

        if (jobId === null) {
          throw new DuplicateRetryInProgressError(
            'Ушбу амалиёт бўйича навбатда фаол вазифа мавжуд.',
            'DUPLICATE_RETRY_IN_PROGRESS',
          );
        }

        // 7. Persist audit record atomically (AC 3, AC 9)
        const auditId = crypto.randomUUID();
        await tx.insert(auditEvents).values({
          id: auditId,
          districtId: issue.districtId,
          actorId: actor.id,
          actorRole: actor.role,
          action: 'OPERATIONAL_RETRY_TRIGGERED',
          metadata: {
            issueId: issue.id,
            retryTrackingId: jobId,
            operationType: jobSpec.operationType,
            queueName: jobSpec.queueName,
            districtId: issue.districtId,
            reason: options.reason || null,
          },
          createdAt: now,
        });

        // 8. Update operational issue metadata (pendingRetry: true, attempt count increment) (AC 3, AC 5)
        const currentMeta = issue.metadata || {};
        const previousCount =
          typeof currentMeta.retryCount === 'number'
            ? currentMeta.retryCount
            : 0;

        const updatedMetadata = {
          ...currentMeta,
          pendingRetry: true,
          lastRetryAt: now.toISOString(),
          retryTrackingId: jobId,
          retryCount: previousCount + 1,
        };

        await tx
          .update(operationalIssues)
          .set({
            metadata: updatedMetadata,
            updatedAt: now,
          })
          .where(eq(operationalIssues.id, issue.id));

        return {
          accepted: true,
          retryTrackingId: jobId,
          operationType: jobSpec.operationType,
          targetId: jobSpec.targetId,
          queuedAt: now.toISOString(),
          message: 'Қайта ижро этиш навбатга муваффақиятли қўшилди.',
        };
      },
    );
  },

  /**
   * Triggers manual retry for a direct background job request inside an atomic transaction (Story 4.3 AC 2, AC 3).
   */
  async retryBackgroundJob(
    pool: pg.Pool,
    boss: PgBoss,
    request: RetryOperationRequest,
    actor: ActorInfo,
  ): Promise<RetryOperationResponse> {
    if (!request.operationType) {
      throw new OperationIneligibleError(
        'Қайта ишга тушириладиган амалиёт тури кўрсатилмади.',
        'OPERATION_INELIGIBLE',
      );
    }

    return await withTransactionalIntake(
      pool,
      boss,
      async ({ tx, enqueueJob }) => {
        const now = new Date();
        let queueName = '';
        let singletonKey = '';
        let payload: Record<string, unknown> = {};
        const targetId = request.targetId || 'global';

        switch (request.operationType) {
          case 'TELEGRAM_TOPIC_RETENTION':
            queueName = TELEGRAM_TOPIC_RETENTION_QUEUE;
            singletonKey = JobSingletonKeys.forRetention(
              request.targetId || undefined,
            );
            payload = {
              districtId: request.targetId || undefined,
              issueId: request.issueId,
            };
            break;
          default:
            throw new OperationIneligibleError(
              'Ушбу амалиёт тури тўғридан-тўғри қайта ишга туширишни қўллаб-қувватламайди.',
              'OPERATION_INELIGIBLE',
            );
        }

        const jobId = await enqueueJob(queueName, payload, {
          singletonKey,
          singletonSeconds: 300,
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
        });

        if (jobId === null) {
          throw new DuplicateRetryInProgressError(
            'Ушбу амалиёт бўйича навбатда фаол вазифа мавжуд.',
            'DUPLICATE_RETRY_IN_PROGRESS',
          );
        }

        const auditId = crypto.randomUUID();
        await tx.insert(auditEvents).values({
          id: auditId,
          districtId: request.targetId !== 'global' ? request.targetId : null,
          actorId: actor.id,
          actorRole: actor.role,
          action: 'OPERATIONAL_RETRY_TRIGGERED',
          metadata: {
            issueId: request.issueId || null,
            retryTrackingId: jobId,
            operationType: request.operationType,
            queueName,
            reason: request.reason || null,
          },
          createdAt: now,
        });

        return {
          accepted: true,
          retryTrackingId: jobId,
          operationType: request.operationType,
          targetId,
          queuedAt: now.toISOString(),
          message: 'Қайта ижро этиш навбатга муваффақиятли қўшилди.',
        };
      },
    );
  },
};

/**
 * Resets the pendingRetry flag on the operational issue when the retry job finishes (Story 4.3 AC 4, AC 5).
 */
export async function clearPendingRetryFlag(
  db: DbClient,
  issueId?: string,
): Promise<void> {
  if (!issueId) return;
  try {
    const [issue] = await db
      .select({ id: operationalIssues.id, metadata: operationalIssues.metadata })
      .from(operationalIssues)
      .where(eq(operationalIssues.id, issueId))
      .limit(1);

    if (issue && issue.metadata?.pendingRetry === true) {
      const updatedMeta = { ...issue.metadata, pendingRetry: false };
      await db
        .update(operationalIssues)
        .set({
          metadata: updatedMeta,
          updatedAt: new Date(),
        })
        .where(eq(operationalIssues.id, issueId));
    }
  } catch (err) {
    console.error('[worker] Error clearing pendingRetry flag:', err);
  }
}

