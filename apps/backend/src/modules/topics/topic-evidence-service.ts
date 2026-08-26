import { sql, eq, and, gt } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import {
  topics,
  topicProjections,
  acceptedEvidence,
} from '../../adapters/db/schema/index.js';
import {
  QualifyingLane,
  TopicCardItem,
  TopicEvidenceItem,
  TopicEvidenceResponse,
  TopicEvidenceQueryOutput,
  encodeKeysetCursor,
  decodeKeysetCursor,
  KeysetCursorPayload,
} from '@mahalla-ovozi/api-contracts';

export interface EvidenceKeysetCursorPayload extends KeysetCursorPayload {
  t: string; // ISO datetime string of originalTimestamp
  msgId: string; // telegramMessageId
  id: string; // evidence id
}

export function encodeEvidenceKeysetCursor(timestamp: string, msgId: string, id: string): string {
  return encodeKeysetCursor<EvidenceKeysetCursorPayload>({ t: timestamp, msgId, id });
}

export function decodeEvidenceKeysetCursor(cursor: string): EvidenceKeysetCursorPayload | null {
  const parsed = decodeKeysetCursor<EvidenceKeysetCursorPayload>(cursor);
  if (
    parsed &&
    typeof parsed.t === 'string' &&
    !Number.isNaN(new Date(parsed.t).getTime()) &&
    typeof parsed.msgId === 'string' &&
    parsed.msgId.length > 0 &&
    typeof parsed.id === 'string' &&
    parsed.id.length > 0
  ) {
    return { t: parsed.t, msgId: parsed.msgId, id: parsed.id };
  }
  return null;
}

/**
 * Custom error thrown when a topic is not found or is inaccessible (AC 1).
 */
export class TopicNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Мавзу топилмади ёки сақлаш муддати тугаган.') {
    super(message);
    this.name = 'TopicNotFoundError';
  }
}

/**
 * Formats a timestamp into Asia/Tashkent time as DD.MM.YYYY HH:mm.
 * Uses deterministic UTC+5 arithmetic to avoid environment or timezone differences.
 */
export function formatTashkentDateTime(date: Date): string {
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  const adjusted = new Date(date.getTime() + 5 * 3600 * 1000);
  const day = String(adjusted.getUTCDate()).padStart(2, '0');
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const year = adjusted.getUTCFullYear();
  const hours = String(adjusted.getUTCHours()).padStart(2, '0');
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Resolves Telegram deep link using a 3-tier algorithm (AC 6):
 * 1. If public group username exists: https://t.me/${username}/${messageId}
 * 2. Else if private supergroup starts with -100: https://t.me/c/${chatIdWithoutPrefix}/${messageId}
 * 3. Otherwise: null (omit link gracefully)
 */
export function resolveTelegramDeepLink(
  groupUsername: string | null | undefined,
  chatId: string,
  messageId: string,
): string | null {
  if (groupUsername && groupUsername.trim().length > 0) {
    const cleanUsername = groupUsername.trim().replace(/^@/, '');
    if (cleanUsername.length > 0) {
      return `https://t.me/${cleanUsername}/${messageId}`;
    }
  }
  if (chatId && chatId.startsWith('-100') && chatId.length > 4) {
    const cleanChatId = chatId.slice(4);
    return `https://t.me/c/${cleanChatId}/${messageId}`;
  }
  return null;
}

/**
 * Privacy-compliant sender attribution sanitization (AC 5, AD-11).
 * Strictly omits telegramUserId and phone numbers.
 */
export function sanitizeSenderAttribution(userMetadata: unknown): {
  authorUsername: string | null;
  authorName: string | null;
} {
  if (!userMetadata || typeof userMetadata !== 'object') {
    return { authorUsername: null, authorName: null };
  }
  const meta = userMetadata as Record<string, unknown>;
  const rawUsername =
    typeof meta.username === 'string' && meta.username.trim().length > 0
      ? meta.username.trim()
      : null;
  const cleanUsername = rawUsername ? rawUsername.replace(/^@/, '').trim() : '';
  const authorUsername = cleanUsername.length > 0 ? `@${cleanUsername}` : null;

  const firstName = typeof meta.firstName === 'string' ? meta.firstName.trim() : '';
  const lastName = typeof meta.lastName === 'string' ? meta.lastName.trim() : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const authorName = fullName.length > 0 ? fullName : null;

  return { authorUsername, authorName };
}

interface RawEvidenceRow extends Record<string, unknown> {
  id: string;
  topicId: string;
  verbatimText: string;
  contentType: string;
  originalTimestamp: Date;
  telegramChatId: string;
  telegramMessageId: string;
  userMetadata: unknown;
  telegramChatUsername: string | null;
}

export class TopicEvidenceService {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  /**
   * Retrieves complete retained Accepted Evidence for a specific Topic (AC 1-6).
   * Validates fixed-district tenant boundary and provides keyset-paginated results.
   */
  async getTopicEvidence(
    actorContext: { id: string; districtId: string; role: string },
    topicId: string,
    query: TopicEvidenceQueryOutput,
  ): Promise<TopicEvidenceResponse> {
    if (!actorContext.districtId) {
      throw new Error('Ҳоким ҳисоби туманга бириктирилмаган.');
    }

    // 1. Fixed-district topic validation with retention deadline guardrail
    const topicRow = await this.db.query.topics.findFirst({
      where: and(
        eq(topics.id, topicId),
        eq(topics.districtId, actorContext.districtId),
        eq(topics.status, 'ACTIVE'),
        gt(topics.retentionExpiresAt, new Date()),
      ),
    });

    if (!topicRow) {
      throw new TopicNotFoundError('Мавзу топилмади ёки сақлаш муддати тугаган.');
    }

    // 2. Query topic projection
    const projectionRow = await this.db.query.topicProjections.findFirst({
      where: eq(topicProjections.topicId, topicId),
    });

    // 3. Count total evidence items for this topic
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(acceptedEvidence)
      .where(
        and(
          eq(acceptedEvidence.topicId, topicId),
          eq(acceptedEvidence.districtId, actorContext.districtId),
        ),
      );
    const totalCount = countResult[0]?.count ?? 0;

    // 4. Build TopicCardItem
    const topicCard: TopicCardItem = {
      id: topicRow.id,
      districtId: topicRow.districtId,
      mahallaName: topicRow.mahallaName,
      calendarDay: topicRow.calendarDay,
      summary: projectionRow?.summary ?? 'Мавзу хулосаси тайёрланмоқда...',
      primaryLane: (topicRow.primaryLane as QualifyingLane) || 'HOKIM_RELATED',
      lanes: (projectionRow?.lanes as QualifyingLane[]) || [
        topicRow.primaryLane as QualifyingLane,
      ],
      additionalLanes: ((projectionRow?.lanes as QualifyingLane[]) || []).filter(
        (l) => l !== topicRow.primaryLane,
      ),
      evidenceCount: totalCount,
      latestMeaningfulActivityTimestamp:
        projectionRow?.latestMeaningfulActivityTimestamp?.toISOString() ||
        topicRow.latestRelevantEvidenceTimestamp.toISOString(),
      isNew: false,
      isUpdated: false,
      createdAt: topicRow.createdAt.toISOString(),
      updatedAt: topicRow.updatedAt.toISOString(),
    };

    // 5. Build Keyset Cursor Predicate (Oldest to newest: ASC, ASC, ASC)
    let cursorPredicate = sql``;
    if (query.cursor) {
      const decoded = decodeEvidenceKeysetCursor(query.cursor);
      if (!decoded) {
        throw new Error('Курсор нотўғри ёки муддати ўтган.');
      }
      const cursorDate = new Date(decoded.t);
      cursorPredicate = sql`AND (
        ae.original_timestamp > ${cursorDate}
        OR (ae.original_timestamp = ${cursorDate} AND ae.telegram_message_id > ${decoded.msgId})
        OR (ae.original_timestamp = ${cursorDate} AND ae.telegram_message_id = ${decoded.msgId} AND ae.id > ${decoded.id})
      )`;
    }

    const limit = query.limit;

    // 6. Query evidence batch with JOIN on district_telegram_groups for group username
    const rawEvidenceRows = await this.db.execute<RawEvidenceRow>(sql`
      SELECT 
        ae.id,
        ae.topic_id AS "topicId",
        ae.verbatim_text AS "verbatimText",
        ae.content_type AS "contentType",
        ae.original_timestamp AS "originalTimestamp",
        ae.telegram_chat_id AS "telegramChatId",
        ae.telegram_message_id AS "telegramMessageId",
        ae.user_metadata AS "userMetadata",
        dtg.telegram_chat_username AS "telegramChatUsername"
      FROM accepted_evidence ae
      LEFT JOIN district_telegram_groups dtg 
        ON dtg.district_id = ae.district_id AND dtg.telegram_chat_id = ae.telegram_chat_id
      WHERE ae.topic_id = ${topicId}
        AND ae.district_id = ${actorContext.districtId}
        ${cursorPredicate}
      ORDER BY ae.original_timestamp ASC, ae.telegram_message_id ASC, ae.id ASC
      LIMIT ${limit + 1};
    `);

    const rows = (rawEvidenceRows.rows || rawEvidenceRows) as unknown as RawEvidenceRow[];

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

    const evidenceList: TopicEvidenceItem[] = pageRows.map((row) => {
      const { authorUsername, authorName } = sanitizeSenderAttribution(row.userMetadata);
      const deepLink = resolveTelegramDeepLink(
        row.telegramChatUsername,
        row.telegramChatId,
        row.telegramMessageId,
      );
      const isAnchor = Boolean(projectionRow && row.id === projectionRow.anchorEvidenceId);
      const originalDate = new Date(row.originalTimestamp);

      return {
        id: row.id,
        topicId: row.topicId,
        verbatimText: row.verbatimText,
        contentType: row.contentType,
        originalTimestamp: originalDate.toISOString(),
        formattedTime: formatTashkentDateTime(originalDate),
        authorName,
        authorUsername,
        isAnchor,
        telegramDeepLink: deepLink,
      };
    });

    const lastRow = pageRows.length > 0 ? pageRows[pageRows.length - 1] : null;
    const nextCursor =
      hasNextPage && lastRow
        ? encodeEvidenceKeysetCursor(
            new Date(lastRow.originalTimestamp).toISOString(),
            lastRow.telegramMessageId,
            lastRow.id,
          )
        : null;

    return {
      topic: topicCard,
      anchorQuote: projectionRow?.anchorQuote ?? '',
      anchorEvidenceId: projectionRow?.anchorEvidenceId ?? '',
      evidence: evidenceList,
      totalCount,
      nextCursor,
      hasNextPage,
    };
  }
}
