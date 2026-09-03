import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbClient } from '../../adapters/db/client.js';
import {
  districts,
  telegramIntakeRecords,
  aiProfiles,
  aiOperations,
  aiProviderAttempts,
  acceptedEvidence,
  topics,
  topicProjections,
} from '../../adapters/db/schema/index.js';
import {
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  withTransactionalIntake,
  JobSingletonKeys,
  type TelegramTopicAssignmentJobData,
  type TelegramTopicProjectionJobData,
} from '../../adapters/jobs/boss-client.js';
import { calculateRetentionDeadline } from '../retention/index.js';
import { recordAuditEvent } from '../audit/audit-service.js';
import { getTashkentCalendarDay } from '../telegram-intake/timezone-util.js';
import { qualifyTelegramContent } from '../telegram-intake/telegram-content-qualification.js';
import {
  encodeKeysetCursor,
  decodeKeysetCursor,
  type ListSignalsQuery,
  type ListSignalsResponse,
  type SignalMessageListItemDto,
  type SignalDetailDto,
  type QualifyingLane,
} from '@mahalla-ovozi/api-contracts';

/**
 * Resolves the display text for a signal message across database evidence and raw payload structures.
 */
export function extractSignalVerbatimText(
  evidenceVerbatimText: string | null | undefined,
  intakeRawPayload: unknown,
): string {
  if (typeof evidenceVerbatimText === 'string' && evidenceVerbatimText.trim().length > 0) {
    return evidenceVerbatimText;
  }

  const raw =
    typeof intakeRawPayload === 'object' && intakeRawPayload !== null
      ? (intakeRawPayload as Record<string, any>)
      : {};

  if (typeof raw.verbatimText === 'string' && raw.verbatimText.trim().length > 0) {
    return raw.verbatimText;
  }

  if (typeof raw.text === 'string' && raw.text.trim().length > 0) {
    return raw.text;
  }

  const message =
    typeof raw.message === 'object' && raw.message !== null
      ? (raw.message as Record<string, any>)
      : typeof raw.edited_message === 'object' && raw.edited_message !== null
        ? (raw.edited_message as Record<string, any>)
        : typeof raw.channel_post === 'object' && raw.channel_post !== null
          ? (raw.channel_post as Record<string, any>)
          : typeof raw.edited_channel_post === 'object' && raw.edited_channel_post !== null
            ? (raw.edited_channel_post as Record<string, any>)
            : null;

  if (message) {
    if (typeof message.text === 'string' && message.text.trim().length > 0) {
      return message.text;
    }
    if (typeof message.caption === 'string' && message.caption.trim().length > 0) {
      return message.caption;
    }
    if (message.left_chat_participant || message.left_chat_member) {
      const user = message.left_chat_participant || message.left_chat_member;
      const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '';
      return name
        ? `(Хизмат хабари: ${name} гуруҳни тарк этди)`
        : `(Хизмат хабари: фойдаланувчи гуруҳни тарк этди)`;
    }
    if (message.new_chat_members || message.new_chat_participant) {
      return `(Хизмат хабари: янги аъзо қўшилди)`;
    }
    if (message.pinned_message) return `(Хизмат хабари: хабар қотирилди)`;
    if (message.photo) return `(Расм хабари)`;
    if (message.voice) return `(Овозли хабар)`;
    if (message.video) return `(Видео хабар)`;
    if (message.document) return `(Ҳужжат)`;
    if (message.sticker) return `(Стикер)`;
  }

  return '(Матн мавжуд эмас)';
}

export class SignalNotFoundError extends Error {
  readonly code = 'SIGNAL_NOT_FOUND' as const;
  readonly statusCode = 404;
  constructor(message = 'Сигнал ёки далил хабари топилмади.') {
    super(message);
    this.name = 'SignalNotFoundError';
  }
}

export class SignalAlreadyAcceptedError extends Error {
  readonly code = 'SIGNAL_ALREADY_ACCEPTED' as const;
  readonly statusCode = 409;
  constructor(message = 'Ушбу хабар аллақачон қабул қилинган далиллар рўйхатида мавжуд.') {
    super(message);
    this.name = 'SignalAlreadyAcceptedError';
  }
}

export class SignalManagementService {
  /**
   * List all signals (both accepted evidence and excluded candidate messages) with filtering and keyset pagination.
   */
  async listSignals(
    db: DbClient,
    query: ListSignalsQuery,
  ): Promise<ListSignalsResponse> {
    const limit = query.limit || 50;

    let queryBuilder = db
      .select({
        intakeId: telegramIntakeRecords.id,
        districtId: telegramIntakeRecords.districtId,
        districtName: districts.name,
        mahallaName: telegramIntakeRecords.mahallaName,
        calendarDay: telegramIntakeRecords.calendarDay,
        telegramBotId: telegramIntakeRecords.telegramBotId,
        telegramChatId: telegramIntakeRecords.telegramChatId,
        telegramMessageId: telegramIntakeRecords.telegramMessageId,
        originalTimestamp: telegramIntakeRecords.originalTimestamp,
        intakeRawPayload: telegramIntakeRecords.rawPayload,
        intakeCreatedAt: telegramIntakeRecords.createdAt,
        evidenceId: acceptedEvidence.id,
        evidenceVerbatimText: acceptedEvidence.verbatimText,
        evidenceContentType: acceptedEvidence.contentType,
        evidenceTopicId: acceptedEvidence.topicId,
        topicPrimaryLane: topics.primaryLane,
        topicSummary: topicProjections.summary,
        aiOpId: aiOperations.id,
        aiOpFinalStatus: aiOperations.finalStatus,
        aiOpResultPayload: aiOperations.resultPayload,
      })
      .from(telegramIntakeRecords)
      .leftJoin(districts, eq(districts.id, telegramIntakeRecords.districtId))
      .leftJoin(
        acceptedEvidence,
        eq(acceptedEvidence.intakeRecordId, telegramIntakeRecords.id),
      )
      .leftJoin(topics, eq(topics.id, acceptedEvidence.topicId))
      .leftJoin(topicProjections, eq(topicProjections.topicId, topics.id))
      .leftJoin(
        aiOperations,
        and(
          eq(aiOperations.targetId, telegramIntakeRecords.id),
          eq(aiOperations.operationType, 'SEMANTIC_RELEVANCE'),
        ),
      )
      .$dynamic();

    const conditions: any[] = [];

    if (query.districtId) {
      conditions.push(eq(telegramIntakeRecords.districtId, query.districtId));
    }
    if (query.mahallaName) {
      conditions.push(eq(telegramIntakeRecords.mahallaName, query.mahallaName));
    }
    if (query.calendarDay) {
      conditions.push(eq(telegramIntakeRecords.calendarDay, query.calendarDay));
    }

    if (query.isRelevant === true) {
      conditions.push(sql`(${acceptedEvidence.id} IS NOT NULL OR ${aiOperations.finalStatus} = 'COMPLETED_RELEVANT')`);
    } else if (query.isRelevant === false) {
      conditions.push(sql`(${acceptedEvidence.id} IS NULL AND (${aiOperations.finalStatus} = 'COMPLETED_IRRELEVANT' OR ${telegramIntakeRecords.rawPayload}->>'status' = 'EXCLUDED'))`);
    }

    if (query.lane) {
      conditions.push(
        sql`(${topics.primaryLane} = ${query.lane} OR ${aiOperations.resultPayload}->'relevant_lanes' ? ${query.lane})`,
      );
    }

    if (query.search && query.search.trim().length > 0) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        sql`(${acceptedEvidence.verbatimText} ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->>'verbatimText' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'message'->>'text' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'message'->>'caption' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'edited_message'->>'text' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'edited_message'->>'caption' ILIKE ${searchPattern})`,
      );
    }

    if (query.startDate) {
      conditions.push(sql`${telegramIntakeRecords.originalTimestamp} >= ${query.startDate}`);
    }
    if (query.endDate) {
      conditions.push(sql`${telegramIntakeRecords.originalTimestamp} <= ${query.endDate}`);
    }

    if (query.cursor) {
      const decoded = decodeKeysetCursor(query.cursor);
      if (decoded && decoded.timestamp) {
        conditions.push(
          sql`(${telegramIntakeRecords.originalTimestamp}, ${telegramIntakeRecords.id}) < (${new Date(decoded.timestamp)}, ${decoded.id})`,
        );
      }
    }

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    queryBuilder = queryBuilder
      .orderBy(
        desc(telegramIntakeRecords.originalTimestamp),
        desc(telegramIntakeRecords.id),
      )
      .limit(limit + 1);

    const rows = await queryBuilder;
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    const items: SignalMessageListItemDto[] = sliced.map((row) => {
      const rawPayload = (row.intakeRawPayload as Record<string, unknown>) || {};
      const aiResult = (row.aiOpResultPayload as Record<string, unknown>) || {};

      let status: 'PENDING' | 'ACCEPTED' | 'REJECTED' = 'REJECTED';
      let isRelevant = false;
      let exclusionReason =
        (aiResult.exclusion_reason as string) ||
        (rawPayload.exclusionReason as string) ||
        null;

      if (row.evidenceId || row.aiOpFinalStatus === 'COMPLETED_RELEVANT') {
        status = 'ACCEPTED';
        isRelevant = true;
      } else if (
        row.aiOpFinalStatus === 'COMPLETED_IRRELEVANT' ||
        rawPayload.status === 'EXCLUDED' ||
        rawPayload.status === 'PURGED'
      ) {
        status = 'REJECTED';
        isRelevant = false;
      } else {
        const qual = qualifyTelegramContent({
          id: row.intakeId,
          districtId: row.districtId,
          mahallaName: row.mahallaName,
          calendarDay: row.calendarDay,
          telegramBotId: row.telegramBotId || '',
          telegramChatId: row.telegramChatId || '',
          telegramMessageId: row.telegramMessageId || '',
          originalTimestamp: row.originalTimestamp,
          rawPayload: row.intakeRawPayload,
        });
        if (qual.status === 'EXCLUDED') {
          status = 'REJECTED';
          isRelevant = false;
          exclusionReason = qual.reason;
        } else {
          status = 'PENDING';
          isRelevant = false;
        }
      }

      const verbatimText = extractSignalVerbatimText(
        row.evidenceVerbatimText,
        row.intakeRawPayload,
      );

      let relevantLanes: QualifyingLane[] = [];
      if (Array.isArray(aiResult.relevant_lanes)) {
        relevantLanes = aiResult.relevant_lanes as QualifyingLane[];
      } else if (row.topicPrimaryLane) {
        relevantLanes = [row.topicPrimaryLane as QualifyingLane];
      }

      const reasoning =
        (aiResult.reasoning as string) ||
        (rawPayload.reasoning as string) ||
        null;

      return {
        id: row.evidenceId || row.intakeId,
        intakeId: row.intakeId,
        evidenceId: row.evidenceId,
        districtId: row.districtId,
        districtName: row.districtName,
        mahallaName: row.mahallaName,
        calendarDay: row.calendarDay,
        originalTimestamp: row.originalTimestamp.toISOString(),
        contentType: (row.evidenceContentType as 'TEXT' | 'MEDIA_CAPTION') || 'TEXT',
        verbatimText,
        status,
        isRelevant,
        relevantLanes,
        exclusionReason,
        reasoning,
        topicId: row.evidenceTopicId,
        topicSummary: row.topicSummary || null,
        aiOperationId: row.aiOpId,
        createdAt: row.intakeCreatedAt.toISOString(),
      };
    });

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (hasMore && sliced.length > 0) {
      const last = sliced[sliced.length - 1];
      if (last) {
        nextCursor = encodeKeysetCursor({
          id: last.intakeId,
          timestamp: last.originalTimestamp.toISOString(),
        });
      }
    }

    if (query.cursor && items.length > 0) {
      const first = items[0];
      if (first) {
        prevCursor = encodeKeysetCursor({
          id: first.intakeId,
          timestamp: first.originalTimestamp,
        });
      }
    }

    return {
      items,
      pagination: {
        limit,
        hasNextPage: hasMore,
        hasPrevPage: !!query.cursor,
        nextCursor,
        prevCursor,
      },
    };
  }

  /**
   * Get single signal detail by ID (either intakeId or evidenceId).
   */
  async getSignalDetail(db: DbClient, id: string): Promise<SignalDetailDto> {
    const [row] = await db
      .select({
        intakeId: telegramIntakeRecords.id,
        districtId: telegramIntakeRecords.districtId,
        districtName: districts.name,
        mahallaName: telegramIntakeRecords.mahallaName,
        calendarDay: telegramIntakeRecords.calendarDay,
        telegramBotId: telegramIntakeRecords.telegramBotId,
        telegramChatId: telegramIntakeRecords.telegramChatId,
        telegramMessageId: telegramIntakeRecords.telegramMessageId,
        telegramUserId: telegramIntakeRecords.telegramUserId,
        originalTimestamp: telegramIntakeRecords.originalTimestamp,
        intakeRawPayload: telegramIntakeRecords.rawPayload,
        intakeCreatedAt: telegramIntakeRecords.createdAt,
        evidenceId: acceptedEvidence.id,
        evidenceVerbatimText: acceptedEvidence.verbatimText,
        evidenceContentType: acceptedEvidence.contentType,
        evidenceUserMetadata: acceptedEvidence.userMetadata,
        evidenceReplyMetadata: acceptedEvidence.replyMetadata,
        evidenceTopicId: acceptedEvidence.topicId,
        topicPrimaryLane: topics.primaryLane,
        topicSummary: topicProjections.summary,
        aiOpId: aiOperations.id,
        aiOpFinalStatus: aiOperations.finalStatus,
        aiOpResultPayload: aiOperations.resultPayload,
      })
      .from(telegramIntakeRecords)
      .leftJoin(districts, eq(districts.id, telegramIntakeRecords.districtId))
      .leftJoin(
        acceptedEvidence,
        eq(acceptedEvidence.intakeRecordId, telegramIntakeRecords.id),
      )
      .leftJoin(topics, eq(topics.id, acceptedEvidence.topicId))
      .leftJoin(topicProjections, eq(topicProjections.topicId, topics.id))
      .leftJoin(
        aiOperations,
        and(
          eq(aiOperations.targetId, telegramIntakeRecords.id),
          eq(aiOperations.operationType, 'SEMANTIC_RELEVANCE'),
        ),
      )
      .where(
        sql`${telegramIntakeRecords.id} = ${id} OR ${acceptedEvidence.id} = ${id}`,
      )
      .limit(1);

    if (!row) {
      throw new SignalNotFoundError();
    }

    const rawPayload = (row.intakeRawPayload as Record<string, unknown>) || {};
    const aiResult = (row.aiOpResultPayload as Record<string, unknown>) || {};

    let status: 'PENDING' | 'ACCEPTED' | 'REJECTED' = 'REJECTED';
    let isRelevant = false;
    let exclusionReason =
      (aiResult.exclusion_reason as string) ||
      (rawPayload.exclusionReason as string) ||
      null;

    if (row.evidenceId || row.aiOpFinalStatus === 'COMPLETED_RELEVANT') {
      status = 'ACCEPTED';
      isRelevant = true;
    } else if (
      row.aiOpFinalStatus === 'COMPLETED_IRRELEVANT' ||
      rawPayload.status === 'EXCLUDED' ||
      rawPayload.status === 'PURGED'
    ) {
      status = 'REJECTED';
      isRelevant = false;
    } else {
      const qual = qualifyTelegramContent({
        id: row.intakeId,
        districtId: row.districtId,
        mahallaName: row.mahallaName,
        calendarDay: row.calendarDay,
        telegramBotId: row.telegramBotId || '',
        telegramChatId: row.telegramChatId || '',
        telegramMessageId: row.telegramMessageId || '',
        originalTimestamp: row.originalTimestamp,
        rawPayload: row.intakeRawPayload,
      });
      if (qual.status === 'EXCLUDED') {
        status = 'REJECTED';
        isRelevant = false;
        exclusionReason = qual.reason;
      } else {
        status = 'PENDING';
        isRelevant = false;
      }
    }

    const verbatimText = extractSignalVerbatimText(
      row.evidenceVerbatimText,
      row.intakeRawPayload,
    );

    let relevantLanes: QualifyingLane[] = [];
    if (Array.isArray(aiResult.relevant_lanes)) {
      relevantLanes = aiResult.relevant_lanes as QualifyingLane[];
    } else if (row.topicPrimaryLane) {
      relevantLanes = [row.topicPrimaryLane as QualifyingLane];
    }

    const reasoning =
      (aiResult.reasoning as string) ||
      (rawPayload.reasoning as string) ||
      null;

    let durationMs: number | null = null;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let estimatedCostUsd: string | null = null;

    if (row.aiOpId) {
      const [attempt] = await db
        .select()
        .from(aiProviderAttempts)
        .where(eq(aiProviderAttempts.operationId, row.aiOpId))
        .orderBy(desc(aiProviderAttempts.attemptNumber))
        .limit(1);

      if (attempt) {
        durationMs = attempt.durationMs;
        inputTokens = attempt.inputTokens;
        outputTokens = attempt.outputTokens;
        estimatedCostUsd = attempt.estimatedCostUsd;
      }
    }

    return {
      signal: {
        id: row.evidenceId || row.intakeId,
        intakeId: row.intakeId,
        evidenceId: row.evidenceId,
        districtId: row.districtId,
        districtName: row.districtName,
        mahallaName: row.mahallaName,
        calendarDay: row.calendarDay,
        originalTimestamp: row.originalTimestamp.toISOString(),
        contentType: (row.evidenceContentType as 'TEXT' | 'MEDIA_CAPTION') || 'TEXT',
        verbatimText,
        status,
        isRelevant,
        relevantLanes,
        exclusionReason,
        reasoning,
        topicId: row.evidenceTopicId,
        topicSummary: row.topicSummary || null,
        aiOperationId: row.aiOpId,
        createdAt: row.intakeCreatedAt.toISOString(),
      },
      telegramChatId: row.telegramChatId,
      telegramMessageId: row.telegramMessageId,
      telegramUserId: row.telegramUserId,
      userMetadata: row.evidenceUserMetadata as Record<string, unknown> | null,
      replyMetadata: row.evidenceReplyMetadata as Record<string, unknown> | null,
      durationMs,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
    };
  }

  /**
   * Promote an ignored/excluded message to Accepted Evidence and trigger Topic Assignment.
   */
  async promoteSignal(
    pool: pg.Pool,
    boss: PgBoss,
    db: DbClient,
    params: {
      intakeId: string;
      lanes: QualifyingLane[];
      changeReason: string;
      actorId?: string;
      actorRole?: string;
    },
  ): Promise<{ success: true; intakeId: string }> {
    const [intake] = await db
      .select()
      .from(telegramIntakeRecords)
      .where(eq(telegramIntakeRecords.id, params.intakeId))
      .limit(1);

    if (!intake) {
      throw new SignalNotFoundError('Таҳлил қилинадиган кирувчи хабар топилмади.');
    }

    const [existingEvidence] = await db
      .select({ id: acceptedEvidence.id })
      .from(acceptedEvidence)
      .where(eq(acceptedEvidence.intakeRecordId, params.intakeId))
      .limit(1);

    if (existingEvidence) {
      throw new SignalAlreadyAcceptedError();
    }

    const rawPayload = (intake.rawPayload as Record<string, unknown>) || {};
    const textFromPayload =
      typeof rawPayload.verbatimText === 'string' && rawPayload.verbatimText.trim()
        ? rawPayload.verbatimText.trim()
        : typeof rawPayload.text === 'string' && rawPayload.text.trim()
          ? rawPayload.text.trim()
          : null;

    if (!textFromPayload) {
      throw new SignalNotFoundError(
        'Ушбу хабарнинг сақлаш муддати (14 кун) тугаган ва матни ўчирилган. Далил сифатида қабул қилиб бўлмайди.',
      );
    }
    const verbatimText = textFromPayload;

    const aiOpId = `aiop_${crypto.randomUUID()}`;

    await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
      const [existingProfile] = await tx
        .select({ id: aiProfiles.id })
        .from(aiProfiles)
        .where(eq(aiProfiles.isActive, true))
        .limit(1);

      const pinnedProfileId =
        existingProfile?.id ||
        (await tx.select({ id: aiProfiles.id }).from(aiProfiles).limit(1))[0]?.id ||
        'prof_default';

      await tx
        .insert(aiOperations)
        .values({
          id: aiOpId,
          districtId: intake.districtId,
          mahallaName: intake.mahallaName,
          calendarDay: intake.calendarDay,
          operationType: 'SEMANTIC_RELEVANCE',
          targetId: intake.id,
          pinnedProfileId,
          contextRevision: 0,
          snapshotFingerprint: 'manual_override',
          finalStatus: 'COMPLETED_RELEVANT',
          resultPayload: {
            is_relevant: true,
            relevant_lanes: params.lanes,
            exclusion_reason: null,
            reasoning: `Manual PO promotion: ${params.changeReason}`,
          },
        })
        .onConflictDoUpdate({
          target: [aiOperations.districtId, aiOperations.operationType, aiOperations.targetId],
          set: {
            finalStatus: 'COMPLETED_RELEVANT',
            resultPayload: {
              is_relevant: true,
              relevant_lanes: params.lanes,
              exclusion_reason: null,
              reasoning: `Manual PO promotion: ${params.changeReason}`,
            },
            updatedAt: new Date(),
          },
        });

      const topicJobData: TelegramTopicAssignmentJobData = {
        intakeId: intake.id,
        districtId: intake.districtId,
        mahallaName: intake.mahallaName,
        calendarDay: intake.calendarDay,
        telegramChatId: intake.telegramChatId,
        telegramMessageId: intake.telegramMessageId,
        telegramUserId: intake.telegramUserId || undefined,
        originalTimestamp: intake.originalTimestamp.toISOString(),
        contentType: 'TEXT',
        verbatimText,
        replyMetadata: null,
        aiOperationId: aiOpId,
        relevantLanes: params.lanes,
        reasoning: `Admin override promotion: ${params.changeReason}`,
      };

      const singletonKey = JobSingletonKeys.forTopicAssignment(
        intake.districtId,
        intake.telegramChatId,
        intake.telegramMessageId,
      );

      await enqueueJob(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE, topicJobData, {
        singletonKey,
        retryLimit: 3,
        retryDelay: 5,
      });

      await recordAuditEvent(tx as any, {
        districtId: intake.districtId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: 'SIGNAL_PROMOTED_TO_EVIDENCE',
        metadata: {
          intakeId: intake.id,
          districtId: intake.districtId,
          mahallaName: intake.mahallaName,
          lanes: params.lanes,
          changeReason: params.changeReason,
        },
      });
    });

    return { success: true, intakeId: params.intakeId };
  }

  /**
   * Reclassify evidence lane, moving it to matching topic or creating new topic and triggering projection.
   */
  async reclassifyEvidence(
    pool: pg.Pool,
    boss: PgBoss,
    db: DbClient,
    params: {
      evidenceId: string;
      lanes: QualifyingLane[];
      changeReason: string;
      actorId?: string;
      actorRole?: string;
    },
  ): Promise<{ success: true; evidenceId: string; newTopicId: string }> {
    const [evidence] = await db
      .select()
      .from(acceptedEvidence)
      .where(eq(acceptedEvidence.id, params.evidenceId))
      .limit(1);

    if (!evidence) {
      throw new SignalNotFoundError('Қайта таснифланадиган далил топилмади.');
    }

    const oldTopicId = evidence.topicId;
    const primaryLane = params.lanes[0] || 'HOKIM_RELATED';

    let newTopicId: string = oldTopicId;

    await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
      const [existingTopic] = await tx
        .select()
        .from(topics)
        .where(
          and(
            eq(topics.districtId, evidence.districtId),
            eq(topics.mahallaName, evidence.mahallaName),
            eq(topics.calendarDay, evidence.calendarDay),
            eq(topics.primaryLane, primaryLane),
            eq(topics.status, 'ACTIVE'),
          ),
        )
        .limit(1);

      let newTargetGen = 1;
      if (existingTopic) {
        newTopicId = existingTopic.id;
        newTargetGen = (existingTopic.requiredDerivedGeneration ?? 0) + 1;
        await tx
          .update(topics)
          .set({ requiredDerivedGeneration: newTargetGen })
          .where(eq(topics.id, newTopicId));
      } else {
        newTopicId = `top_${crypto.randomUUID()}`;
        const retentionExpiresAt = calculateRetentionDeadline(evidence.originalTimestamp);

        await tx.insert(topics).values({
          id: newTopicId,
          districtId: evidence.districtId,
          mahallaName: evidence.mahallaName,
          calendarDay: evidence.calendarDay,
          primaryLane: primaryLane as string,
          status: 'ACTIVE',
          latestRelevantEvidenceTimestamp: evidence.originalTimestamp,
          retentionExpiresAt,
          requiredDerivedGeneration: 1,
          appliedDerivedGeneration: 0,
        });
        newTargetGen = 1;
      }

      if (oldTopicId !== newTopicId) {
        // Decouple anchor projection if this evidence was the anchor for oldTopicId
        await tx
          .delete(topicProjections)
          .where(
            and(
              eq(topicProjections.topicId, oldTopicId),
              eq(topicProjections.anchorEvidenceId, evidence.id),
            ),
          );
      }

      await tx
        .update(acceptedEvidence)
        .set({ topicId: newTopicId })
        .where(eq(acceptedEvidence.id, evidence.id));

      await enqueueJob(
        TELEGRAM_TOPIC_PROJECTION_QUEUE,
        {
          topicId: newTopicId,
          districtId: evidence.districtId,
          mahallaName: evidence.mahallaName,
          calendarDay: evidence.calendarDay,
          generation: newTargetGen,
        } as TelegramTopicProjectionJobData,
        {
          singletonKey: JobSingletonKeys.forTopicProjection(newTopicId, newTargetGen),
          retryLimit: 3,
        },
      );

      if (oldTopicId !== newTopicId) {
        const remaining = await tx
          .select({ id: acceptedEvidence.id })
          .from(acceptedEvidence)
          .where(eq(acceptedEvidence.topicId, oldTopicId));

        if (remaining.length === 0) {
          await tx.delete(topicProjections).where(eq(topicProjections.topicId, oldTopicId));
          await tx.delete(topics).where(eq(topics.id, oldTopicId));
        } else {
          const [oldTopic] = await tx
            .select({ requiredDerivedGeneration: topics.requiredDerivedGeneration })
            .from(topics)
            .where(eq(topics.id, oldTopicId))
            .limit(1);

          const oldNextGen = (oldTopic?.requiredDerivedGeneration ?? 0) + 1;
          await tx
            .update(topics)
            .set({ requiredDerivedGeneration: oldNextGen })
            .where(eq(topics.id, oldTopicId));

          await enqueueJob(
            TELEGRAM_TOPIC_PROJECTION_QUEUE,
            {
              topicId: oldTopicId,
              districtId: evidence.districtId,
              mahallaName: evidence.mahallaName,
              calendarDay: evidence.calendarDay,
              generation: oldNextGen,
            } as TelegramTopicProjectionJobData,
            {
              singletonKey: JobSingletonKeys.forTopicProjection(oldTopicId, oldNextGen),
              retryLimit: 3,
            },
          );
        }
      }

      await recordAuditEvent(tx as any, {
        districtId: evidence.districtId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: 'EVIDENCE_RECLASSIFIED',
        metadata: {
          evidenceId: evidence.id,
          oldTopicId,
          newTopicId,
          newLanes: params.lanes,
          changeReason: params.changeReason,
        },
      });
    });

    return { success: true, evidenceId: params.evidenceId, newTopicId };
  }

  /**
   * Update verbatim text of an existing evidence record.
   */
  async updateEvidenceText(
    pool: pg.Pool,
    boss: PgBoss,
    db: DbClient,
    params: {
      evidenceId: string;
      verbatimText: string;
      changeReason: string;
      actorId?: string;
      actorRole?: string;
    },
  ): Promise<{ success: true; evidenceId: string }> {
    const [evidence] = await db
      .select()
      .from(acceptedEvidence)
      .where(eq(acceptedEvidence.id, params.evidenceId))
      .limit(1);

    if (!evidence) {
      throw new SignalNotFoundError('Таҳрирланадиган далил топилмади.');
    }

    await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
      await tx
        .update(acceptedEvidence)
        .set({
          verbatimText: params.verbatimText,
        })
        .where(eq(acceptedEvidence.id, evidence.id));

      const [targetTopic] = await tx
        .select({ requiredDerivedGeneration: topics.requiredDerivedGeneration })
        .from(topics)
        .where(eq(topics.id, evidence.topicId))
        .limit(1);

      const nextGen = (targetTopic?.requiredDerivedGeneration ?? 0) + 1;
      await tx
        .update(topics)
        .set({ requiredDerivedGeneration: nextGen })
        .where(eq(topics.id, evidence.topicId));

      await enqueueJob(
        TELEGRAM_TOPIC_PROJECTION_QUEUE,
        {
          topicId: evidence.topicId,
          districtId: evidence.districtId,
          mahallaName: evidence.mahallaName,
          calendarDay: evidence.calendarDay,
          generation: nextGen,
        } as TelegramTopicProjectionJobData,
        {
          singletonKey: JobSingletonKeys.forTopicProjection(evidence.topicId, nextGen),
          retryLimit: 3,
        },
      );

      await recordAuditEvent(tx as any, {
        districtId: evidence.districtId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: 'EVIDENCE_TEXT_UPDATED',
        metadata: {
          evidenceId: evidence.id,
          topicId: evidence.topicId,
          oldTextSnippet: evidence.verbatimText.slice(0, 100),
          newTextSnippet: params.verbatimText.slice(0, 100),
          changeReason: params.changeReason,
        },
      });
    });

    return { success: true, evidenceId: params.evidenceId };
  }

  /**
   * Delete an evidence record and trigger topic cascade/projection.
   */
  async deleteEvidence(
    pool: pg.Pool,
    boss: PgBoss,
    db: DbClient,
    params: {
      evidenceId: string;
      changeReason: string;
      actorId?: string;
      actorRole?: string;
    },
  ): Promise<{ success: true; deletedEvidenceId: string; topicDeleted: boolean }> {
    const [evidence] = await db
      .select()
      .from(acceptedEvidence)
      .where(eq(acceptedEvidence.id, params.evidenceId))
      .limit(1);

    if (!evidence) {
      throw new SignalNotFoundError('Ўчириладиган далил топилмади.');
    }

    const topicId = evidence.topicId;
    let topicDeleted = false;

    await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
      // 1. Decouple or clean up projection if this evidence is the anchor
      await tx
        .delete(topicProjections)
        .where(
          and(
            eq(topicProjections.topicId, topicId),
            eq(topicProjections.anchorEvidenceId, evidence.id),
          ),
        );

      await tx.delete(acceptedEvidence).where(eq(acceptedEvidence.id, evidence.id));

      if (evidence.intakeRecordId) {
        await tx
          .delete(aiOperations)
          .where(
            and(
              eq(aiOperations.targetId, evidence.intakeRecordId),
              eq(aiOperations.districtId, evidence.districtId),
            ),
          );
        await tx
          .delete(telegramIntakeRecords)
          .where(eq(telegramIntakeRecords.id, evidence.intakeRecordId));
      }
      await tx
        .delete(aiOperations)
        .where(
          and(
            eq(aiOperations.targetId, evidence.id),
            eq(aiOperations.districtId, evidence.districtId),
          ),
        );

      const remaining = await tx
        .select({ id: acceptedEvidence.id })
        .from(acceptedEvidence)
        .where(eq(acceptedEvidence.topicId, topicId));

      if (remaining.length === 0) {
        await tx.delete(topicProjections).where(eq(topicProjections.topicId, topicId));
        await tx.delete(topics).where(eq(topics.id, topicId));
        topicDeleted = true;
      } else {
        const [targetTopic] = await tx
          .select({ requiredDerivedGeneration: topics.requiredDerivedGeneration })
          .from(topics)
          .where(eq(topics.id, topicId))
          .limit(1);

        const nextGen = (targetTopic?.requiredDerivedGeneration ?? 0) + 1;
        await tx
          .update(topics)
          .set({ requiredDerivedGeneration: nextGen })
          .where(eq(topics.id, topicId));

        await enqueueJob(
          TELEGRAM_TOPIC_PROJECTION_QUEUE,
          {
            topicId,
            districtId: evidence.districtId,
            mahallaName: evidence.mahallaName,
            calendarDay: evidence.calendarDay,
            generation: nextGen,
          } as TelegramTopicProjectionJobData,
          {
            singletonKey: JobSingletonKeys.forTopicProjection(topicId, nextGen),
            retryLimit: 3,
          },
        );
      }

      await recordAuditEvent(tx as any, {
        districtId: evidence.districtId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: 'EVIDENCE_DELETED',
        metadata: {
          evidenceId: evidence.id,
          topicId,
          topicDeleted,
          changeReason: params.changeReason,
        },
      });
    });

    return { success: true, deletedEvidenceId: params.evidenceId, topicDeleted };
  }

  /**
   * Create a manual civic signal (intake + topic assignment).
   */
  async createManualSignal(
    pool: pg.Pool,
    boss: PgBoss,
    _db: DbClient,
    params: {
      districtId: string;
      mahallaName: string;
      verbatimText: string;
      lanes: QualifyingLane[];
      originalTimestamp?: string;
      changeReason: string;
      actorId?: string;
      actorRole?: string;
    },
  ): Promise<{ success: true; intakeId: string }> {
    const intakeId = `man_${crypto.randomUUID()}`;
    const timestamp = params.originalTimestamp ? new Date(params.originalTimestamp) : new Date();
    const calendarDay = getTashkentCalendarDay(timestamp);
    const telegramChatId = `manual_chat_${params.districtId}`;
    const telegramMessageId = `manual_msg_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const aiOpId = `aiop_${crypto.randomUUID()}`;

    await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
      await tx.insert(telegramIntakeRecords).values({
        id: intakeId,
        districtId: params.districtId,
        mahallaName: params.mahallaName,
        telegramBotId: 'manual_bot',
        telegramChatId,
        telegramMessageId,
        originalTimestamp: timestamp,
        calendarDay,
        rawPayload: {
          status: 'ACCEPTED_MANUAL',
          verbatimText: params.verbatimText,
          lanes: params.lanes,
          changeReason: params.changeReason,
        },
      });

      const [existingProfile] = await tx
        .select({ id: aiProfiles.id })
        .from(aiProfiles)
        .where(eq(aiProfiles.isActive, true))
        .limit(1);

      const pinnedProfileId =
        existingProfile?.id ||
        (await tx.select({ id: aiProfiles.id }).from(aiProfiles).limit(1))[0]?.id ||
        'prof_default';

      await tx.insert(aiOperations).values({
        id: aiOpId,
        districtId: params.districtId,
        mahallaName: params.mahallaName,
        calendarDay,
        operationType: 'SEMANTIC_RELEVANCE',
        targetId: intakeId,
        pinnedProfileId,
        contextRevision: 0,
        snapshotFingerprint: 'manual_creation',
        finalStatus: 'COMPLETED_RELEVANT',
        resultPayload: {
          is_relevant: true,
          relevant_lanes: params.lanes,
          exclusion_reason: null,
          reasoning: `Manual Signal Created: ${params.changeReason}`,
        },
      });

      const topicJobData: TelegramTopicAssignmentJobData = {
        intakeId,
        districtId: params.districtId,
        mahallaName: params.mahallaName,
        calendarDay,
        telegramChatId,
        telegramMessageId,
        originalTimestamp: timestamp.toISOString(),
        contentType: 'TEXT',
        verbatimText: params.verbatimText,
        replyMetadata: null,
        aiOperationId: aiOpId,
        relevantLanes: params.lanes,
        reasoning: `Manual creation: ${params.changeReason}`,
      };

      const singletonKey = JobSingletonKeys.forTopicAssignment(
        params.districtId,
        telegramChatId,
        telegramMessageId,
      );

      await enqueueJob(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE, topicJobData, {
        singletonKey,
        retryLimit: 3,
      });

      await recordAuditEvent(tx as any, {
        districtId: params.districtId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: 'SIGNAL_MANUALLY_CREATED',
        metadata: {
          intakeId,
          districtId: params.districtId,
          mahallaName: params.mahallaName,
          lanes: params.lanes,
          changeReason: params.changeReason,
        },
      });
    });

    return { success: true, intakeId };
  }

  /**
   * Batch delete multiple signals (evidence items or intake records).
   */
  async batchDeleteSignals(
    pool: pg.Pool,
    boss: PgBoss,
    db: DbClient,
    params: {
      ids: string[];
      changeReason: string;
      actorId?: string;
      actorRole?: string;
    },
  ): Promise<{
    success: true;
    deletedCount: number;
    topicsAffected: number;
    topicsDeleted: number;
  }> {
    let deletedCount = 0;
    const affectedTopicIds = new Set<string>();
    let topicsDeletedCount = 0;

    for (const id of params.ids) {
      // 1. Check if ID matches acceptedEvidence.id or points to acceptedEvidence via intakeRecordId
      const [evidence] = await db
        .select()
        .from(acceptedEvidence)
        .where(
          sql`${acceptedEvidence.id} = ${id} OR ${acceptedEvidence.intakeRecordId} = ${id}`,
        )
        .limit(1);

      if (evidence) {
        const result = await this.deleteEvidence(pool, boss, db, {
          evidenceId: evidence.id,
          changeReason: params.changeReason,
          actorId: params.actorId,
          actorRole: params.actorRole,
        });
        if (result.success) {
          deletedCount++;
          affectedTopicIds.add(evidence.topicId);
          if (result.topicDeleted) {
            topicsDeletedCount++;
          }
        }
      } else {
        // 2. Check if ID is in telegramIntakeRecords (unassigned/ignored/excluded/pending)
        const [intake] = await db
          .select()
          .from(telegramIntakeRecords)
          .where(eq(telegramIntakeRecords.id, id))
          .limit(1);

        if (intake) {
          await db.transaction(async (tx) => {
            // Delete any dangling accepted_evidence referencing this intake
            await tx
              .delete(acceptedEvidence)
              .where(eq(acceptedEvidence.intakeRecordId, intake.id));

            await tx
              .delete(aiOperations)
              .where(
                and(
                  eq(aiOperations.targetId, intake.id),
                  eq(aiOperations.districtId, intake.districtId),
                ),
              );

            await tx
              .delete(telegramIntakeRecords)
              .where(eq(telegramIntakeRecords.id, intake.id));

            await recordAuditEvent(tx as any, {
              districtId: intake.districtId,
              actorId: params.actorId,
              actorRole: params.actorRole,
              action: 'SIGNAL_DELETED',
              metadata: {
                intakeId: intake.id,
                changeReason: params.changeReason,
              },
            });
          });
          deletedCount++;
        }
      }
    }

    return {
      success: true,
      deletedCount,
      topicsAffected: affectedTopicIds.size,
      topicsDeleted: topicsDeletedCount,
    };
  }
}

export const signalManagementService = new SignalManagementService();
