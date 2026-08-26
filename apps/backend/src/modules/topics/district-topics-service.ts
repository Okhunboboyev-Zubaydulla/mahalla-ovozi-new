import { sql, eq } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import { districts } from '../../adapters/db/schema/index.js';
import {
  QualifyingLane,
  TopicCardItem,
  DistrictTopicsSearchBodyOutput,
  DistrictTopicsPageResponse,
  TopicEvidenceResponse,
  TopicEvidenceQueryOutput,
  encodeKeysetCursor,
  decodeKeysetCursor,
  KeysetCursorPayload,
} from '@mahalla-ovozi/api-contracts';
import {
  TopicEvidenceService,
  TopicNotFoundError,
} from './topic-evidence-service.js';
import { escapeLikePattern } from './hokim-topic-service.js';
import { resolveDateBoundary } from '../telegram-intake/timezone-util.js';

export { escapeLikePattern, resolveDateBoundary, TopicNotFoundError };

export interface DistrictTopicKeysetCursorPayload extends KeysetCursorPayload {
  t: string; // ISO datetime string of latestMeaningfulActivityTimestamp
  id: string; // topic id
}

export function encodeDistrictTopicKeysetCursor(timestamp: string, id: string): string {
  return encodeKeysetCursor<DistrictTopicKeysetCursorPayload>({ t: timestamp, id });
}

export function decodeDistrictTopicKeysetCursor(
  cursor: string,
): DistrictTopicKeysetCursorPayload | null {
  const parsed = decodeKeysetCursor<DistrictTopicKeysetCursorPayload>(cursor);
  if (
    parsed &&
    typeof parsed.t === 'string' &&
    !Number.isNaN(new Date(parsed.t).getTime()) &&
    typeof parsed.id === 'string' &&
    parsed.id.length > 0 &&
    parsed.id.length <= 100
  ) {
    const time = new Date(parsed.t).getTime();
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 86400 * 1000;
    const oneMinuteInFuture = now + 60 * 1000;
    if (time < ninetyDaysAgo || time > oneMinuteInFuture) {
      return null;
    }
    return { t: parsed.t, id: parsed.id };
  }
  return null;
}

export class DistrictNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'DISTRICT_NOT_FOUND';
  constructor(message = 'Туман топилмади.') {
    super(message);
    this.name = 'DistrictNotFoundError';
  }
}

export class DistrictRequiredError extends Error {
  readonly statusCode = 400;
  readonly code = 'DISTRICT_REQUIRED';
  constructor(message = 'Туман ID кўрсатилиши шарт.') {
    super(message);
    this.name = 'DistrictRequiredError';
  }
}

export class InvalidCursorError extends Error {
  readonly statusCode = 400;
  readonly code = 'INVALID_CURSOR';
  constructor(message = 'Курсор нотўғри ёки муддати ўтган.') {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

interface RawTopicRow extends Record<string, unknown> {
  id: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  primaryLane: QualifyingLane;
  createdAt: Date;
  updatedAt: Date;
  summary: string;
  lanes: QualifyingLane[] | null;
  latestMeaningfulActivityTimestamp: Date;
  evidenceCount: number;
  searchMatchBadge?: 'evidence' | 'author' | null;
}

export class DistrictTopicsService {
  private readonly db: DbClient;
  private readonly topicEvidenceService: TopicEvidenceService;

  constructor(db: DbClient) {
    this.db = db;
    this.topicEvidenceService = new TopicEvidenceService(db);
  }

  /**
   * Retrieves paginated, filterable, searchable canonical Topics for an explicitly selected District (AC 1-4, 6, 10).
   */
  async getDistrictTopics(params: {
    districtId: string;
    filter: DistrictTopicsSearchBodyOutput;
  }): Promise<DistrictTopicsPageResponse> {
    const { districtId, filter } = params;

    if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
      throw new DistrictRequiredError('Туман ID кўрсатилиши шарт.');
    }

    const district = await this.db.query.districts.findFirst({
      where: eq(districts.id, districtId),
    });

    if (!district) {
      throw new DistrictNotFoundError('Туман топилмади.');
    }

    const { datePredicate } = resolveDateBoundary({
      dateScope: filter.dateScope,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      calendarDay: filter.calendarDay,
    });

    let mahallaPredicate = sql``;
    if (filter.mahallaName && filter.mahallaName.trim() !== '' && filter.mahallaName !== 'all') {
      mahallaPredicate = sql`AND t.mahalla_name = ${filter.mahallaName.trim()}`;
    }

    let lanePredicate = sql``;
    if (filter.lanes && Array.isArray(filter.lanes) && filter.lanes.length > 0) {
      const laneClauses = filter.lanes.map((l) => {
        if (l === 'HOKIM_RELATED') {
          return sql`(tp.is_hokim_related = true OR tp.lanes @> '["HOKIM_RELATED"]'::jsonb OR t.primary_lane = 'HOKIM_RELATED')`;
        }
        return sql`(tp.lanes @> ${JSON.stringify([l])}::jsonb OR t.primary_lane = ${l})`;
      });
      lanePredicate = sql`AND (${sql.join(laneClauses, sql` OR `)})`;
    }

    let searchPredicate = sql``;
    let badgeSelect = sql`NULL::text AS "searchMatchBadge"`;

    const trimmedSearch = filter.search?.trim();
    if (trimmedSearch) {
      const pattern = `%${escapeLikePattern(trimmedSearch)}%`;
      searchPredicate = sql`AND (
        tp.summary ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM accepted_evidence ae 
          WHERE ae.topic_id = t.id 
            AND ae.district_id = ${districtId}
            AND (
              ae.verbatim_text ILIKE ${pattern}
              OR ae.user_metadata->>'username' ILIKE ${pattern}
              OR (ae.user_metadata->>'username' IS NOT NULL AND CONCAT('@', ae.user_metadata->>'username') ILIKE ${pattern})
              OR ae.user_metadata->>'firstName' ILIKE ${pattern}
              OR ae.user_metadata->>'lastName' ILIKE ${pattern}
              OR ((ae.user_metadata->>'firstName' IS NOT NULL OR ae.user_metadata->>'lastName' IS NOT NULL) AND CONCAT_WS(' ', ae.user_metadata->>'firstName', ae.user_metadata->>'lastName') ILIKE ${pattern})
            )
        )
      )`;

      badgeSelect = sql`CASE 
        WHEN EXISTS (
          SELECT 1 FROM accepted_evidence ae 
          WHERE ae.topic_id = t.id 
            AND ae.district_id = ${districtId}
            AND (
              ae.user_metadata->>'username' ILIKE ${pattern}
              OR (ae.user_metadata->>'username' IS NOT NULL AND CONCAT('@', ae.user_metadata->>'username') ILIKE ${pattern})
              OR ae.user_metadata->>'firstName' ILIKE ${pattern}
              OR ae.user_metadata->>'lastName' ILIKE ${pattern}
              OR ((ae.user_metadata->>'firstName' IS NOT NULL OR ae.user_metadata->>'lastName' IS NOT NULL) AND CONCAT_WS(' ', ae.user_metadata->>'firstName', ae.user_metadata->>'lastName') ILIKE ${pattern})
            )
        ) THEN 'author'
        WHEN EXISTS (
          SELECT 1 FROM accepted_evidence ae 
          WHERE ae.topic_id = t.id 
            AND ae.district_id = ${districtId}
            AND ae.verbatim_text ILIKE ${pattern}
        ) THEN 'evidence'
        ELSE NULL 
      END AS "searchMatchBadge"`;
    }

    let cursorPredicate = sql``;
    if (filter.cursor) {
      const decoded = decodeDistrictTopicKeysetCursor(filter.cursor);
      if (!decoded) {
        throw new InvalidCursorError('Курсор нотўғри ёки муддати ўтган.');
      }
      const cursorDate = new Date(decoded.t);
      cursorPredicate = sql`AND (
        date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) < ${cursorDate}
        OR (date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) = ${cursorDate} AND t.id < ${decoded.id})
      )`;
    }

    const limit = filter.limit ?? 20;

    const query = sql<RawTopicRow>`
      SELECT 
        t.id, 
        t.district_id AS "districtId", 
        t.mahalla_name AS "mahallaName", 
        t.calendar_day AS "calendarDay", 
        t.primary_lane AS "primaryLane", 
        t.created_at AS "createdAt", 
        t.updated_at AS "updatedAt",
        tp.summary, 
        tp.lanes, 
        tp.latest_meaningful_activity_timestamp AS "latestMeaningfulActivityTimestamp",
        COUNT(ae.id)::int AS "evidenceCount",
        ${badgeSelect}
      FROM topics t
      JOIN topic_projections tp ON tp.topic_id = t.id
      LEFT JOIN accepted_evidence ae ON ae.topic_id = t.id AND ae.district_id = ${districtId}
      WHERE t.district_id = ${districtId}
        AND ${datePredicate}
        ${mahallaPredicate}
        AND t.status = 'ACTIVE'
        AND t.retention_expires_at > NOW()
        ${lanePredicate}
        ${cursorPredicate}
        ${searchPredicate}
      GROUP BY t.id, tp.id
      ORDER BY date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) DESC, t.id DESC
      LIMIT ${limit + 1};
    `;

    const countQuery = sql<{ count: number }>`
      SELECT COUNT(DISTINCT t.id)::int AS count
      FROM topics t
      JOIN topic_projections tp ON tp.topic_id = t.id
      WHERE t.district_id = ${districtId}
        AND ${datePredicate}
        ${mahallaPredicate}
        AND t.status = 'ACTIVE'
        AND t.retention_expires_at > NOW()
        ${lanePredicate}
        ${searchPredicate};
    `;

    const [topicsResult, countResult] = await Promise.all([
      this.db.execute<RawTopicRow>(query),
      this.db.execute<{ count: number }>(countQuery),
    ]);

    const rows = topicsResult.rows;
    const totalCount = Number(countResult.rows[0]?.count ?? 0);

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

    const topics: TopicCardItem[] = pageRows.map((row) => {
      const allLanes =
        Array.isArray(row.lanes) && row.lanes.length > 0
          ? (row.lanes as QualifyingLane[])
          : [(row.primaryLane as QualifyingLane) || 'HOKIM_RELATED'];

      const additionalLanes = allLanes.filter((l) => l !== row.primaryLane);

      let searchMatchBadge: 'evidence' | 'author' | null = null;
      if (row.searchMatchBadge === 'evidence' || row.searchMatchBadge === 'author') {
        searchMatchBadge = row.searchMatchBadge;
      }

      return {
        id: row.id,
        districtId: row.districtId,
        mahallaName: row.mahallaName,
        calendarDay: row.calendarDay,
        summary: row.summary,
        primaryLane: (row.primaryLane as QualifyingLane) || 'HOKIM_RELATED',
        lanes: allLanes,
        additionalLanes,
        evidenceCount: Number(row.evidenceCount) || 0,
        latestMeaningfulActivityTimestamp: new Date(
          row.latestMeaningfulActivityTimestamp,
        ).toISOString(),
        isNew: false,
        isUpdated: false,
        searchMatchBadge,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      };
    });

    let nextCursor: string | null = null;
    if (hasNextPage && topics.length > 0) {
      const lastItem = topics[topics.length - 1];
      if (lastItem) {
        nextCursor = encodeDistrictTopicKeysetCursor(
          lastItem.latestMeaningfulActivityTimestamp,
          lastItem.id,
        );
      }
    }

    return {
      districtId: district.id,
      districtName: district.name,
      topics,
      totalCount,
      nextCursor,
      hasNextPage,
      serverEvaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves complete retained Accepted Evidence for a specific Topic within the explicit District scope (AC 5, 6).
   */
  async getDistrictTopicEvidence(params: {
    districtId: string;
    topicId: string;
    query: TopicEvidenceQueryOutput;
  }): Promise<TopicEvidenceResponse> {
    const { districtId, topicId, query } = params;

    if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
      throw new DistrictRequiredError('Туман ID кўрсатилиши шарт.');
    }

    const district = await this.db.query.districts.findFirst({
      where: eq(districts.id, districtId),
    });

    if (!district) {
      throw new DistrictNotFoundError('Туман топилмади.');
    }

    return this.topicEvidenceService.getTopicEvidence(
      { id: 'product_owner', districtId, role: 'PRODUCT_OWNER' },
      topicId,
      query,
    );
  }

  /**
   * Retrieves distinct Mahalla names for the selected District sorted in Uzbek Cyrillic.
   */
  async getDistrictMahallas(districtId: string): Promise<string[]> {
    if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
      throw new DistrictRequiredError('Туман ID кўрсатилиши шарт.');
    }

    const district = await this.db.query.districts.findFirst({
      where: eq(districts.id, districtId),
    });

    if (!district) {
      throw new DistrictNotFoundError('Туман топилмади.');
    }

    const result = await this.db.execute<{ mahalla_name: string }>(sql`
      SELECT DISTINCT mahalla_name FROM (
        SELECT mahalla_name 
        FROM district_telegram_groups 
        WHERE district_id = ${districtId} 
          AND status != 'FAILED'
        UNION
        SELECT mahalla_name 
        FROM topics 
        WHERE district_id = ${districtId} 
          AND status = 'ACTIVE'
          AND retention_expires_at > NOW()
      ) combined
      WHERE mahalla_name IS NOT NULL AND TRIM(mahalla_name) != '';
    `);

    const mahallas = result.rows
      .map((r) => r.mahalla_name?.trim())
      .filter((name): name is string => Boolean(name && name.length > 0));

    const uniqueMahallas = Array.from(new Set(mahallas));
    uniqueMahallas.sort((a, b) => a.localeCompare(b, 'uz-Cyrl', { sensitivity: 'base' }));

    return uniqueMahallas;
  }
}
