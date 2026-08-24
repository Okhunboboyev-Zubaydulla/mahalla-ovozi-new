import crypto from 'node:crypto';
import { sql, eq, and, desc } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import {
  districts,
  userDashboardVisits,
} from '../../adapters/db/schema/index.js';
import {
  QualifyingLane,
  TopicCardItem,
  HokimLaneBoardData,
  HokimTopicBoardResponse,
  HokimLaneResponse,
  DateFilterScope,
  HokimTopicStatisticsQueryOutput,
  HokimTopicStatisticsResponse,
  TopicStatisticCard4,
  TopicStatisticCard5,
} from '@mahalla-ovozi/api-contracts';
import { getTashkentCalendarDay } from '../telegram-intake/timezone-util.js';

export const CANONICAL_LANES: QualifyingLane[] = [
  'HOKIM_RELATED',
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
];

export interface HokimTopicBoardFilterParams {
  search?: string;
  dateScope?: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  mahallaName?: string;
  lanes?: QualifyingLane[];
  calendarDay?: string;
  baselineTimestamp?: string;
}

export interface HokimLaneQueryParams {
  lane: QualifyingLane;
  search?: string;
  dateScope?: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  mahallaName?: string;
  calendarDay?: string;
  cursor?: string;
  limit?: number;
  baselineTimestamp?: string;
}

export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

export function resolveDateBoundary(params: {
  dateScope?: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  calendarDay?: string;
}): {
  datePredicate: ReturnType<typeof sql>;
  resolvedCalendarDay: string;
} {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const today = getTashkentCalendarDay(nowSeconds);
  const yesterday = getTashkentCalendarDay(nowSeconds - 86400);
  const retentionLowerBound = getTashkentCalendarDay(nowSeconds - 90 * 86400);

  const scope = params.dateScope ?? 'today';

  if (scope === 'yesterday') {
    return {
      datePredicate: sql`t.calendar_day = ${yesterday}`,
      resolvedCalendarDay: yesterday,
    };
  }

  if (scope === 'custom') {
    const { dateFrom, dateTo } = params;
    if (!dateFrom || !dateTo) {
      throw new Error('Бошланиш ва тугаш саналари киритилиши шарт.');
    }
    if (dateFrom > dateTo) {
      throw new Error('Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.');
    }
    if (dateFrom < retentionLowerBound) {
      throw new Error('Сана 90 кунлик сақлаш муддатидан эски бўлиши мумкин эмас.');
    }
    if (dateTo > today) {
      throw new Error('Сана бугунги кундан кейин бўлиши мумкин эмас.');
    }

    return {
      datePredicate: sql`t.calendar_day >= ${dateFrom} AND t.calendar_day <= ${dateTo}`,
      resolvedCalendarDay: dateFrom === dateTo ? dateFrom : `${dateFrom}..${dateTo}`,
    };
  }

  if (params.calendarDay) {
    if (params.calendarDay < retentionLowerBound) {
      throw new Error('Сана 90 кунлик сақлаш муддатидан эски бўлиши мумкин эмас.');
    }
    if (params.calendarDay > today) {
      throw new Error('Сана бугунги кундан кейин бўлиши мумкин эмас.');
    }
    return {
      datePredicate: sql`t.calendar_day = ${params.calendarDay}`,
      resolvedCalendarDay: params.calendarDay,
    };
  }

  return {
    datePredicate: sql`t.calendar_day = ${today}`,
    resolvedCalendarDay: today,
  };
}

export interface KeysetCursorPayload {
  t: string; // ISO datetime string
  id: string; // topic id
}

export function encodeKeysetCursor(timestamp: string, id: string): string {
  return Buffer.from(JSON.stringify({ t: timestamp, id })).toString('base64url');
}

export function decodeKeysetCursor(cursor: string): KeysetCursorPayload | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.t === 'string' &&
      typeof parsed.id === 'string' &&
      parsed.id.length > 0 &&
      parsed.id.length <= 100
    ) {
      const time = new Date(parsed.t).getTime();
      if (Number.isNaN(time)) return null;

      const now = Date.now();
      const ninetyDaysAgo = now - 90 * 86400 * 1000;
      const oneMinuteInFuture = now + 60 * 1000;
      if (time < ninetyDaysAgo || time > oneMinuteInFuture) {
        return null;
      }

      return { t: parsed.t, id: parsed.id };
    }
    return null;
  } catch {
    return null;
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
  isHokimRelated: boolean;
  latestMeaningfulActivityTimestamp: Date;
  projectionUpdatedAt: Date;
  evidenceCount: number;
  searchMatchBadge?: 'evidence' | 'author' | null;
}

export class HokimTopicService {
  constructor(private readonly db: DbClient) {}

  /**
   * Retrieves today's or filtered multi-lane unified board for the authenticated Hokim's district,
   * evaluating freshness against the baseline timestamp (or preceding visit) and
   * returning server-backed evaluation time and processing delay status.
   */
  async getTodayBoard(
    actorContext: { id: string; districtId: string; role: string },
    paramsOrCalendarDay?: HokimTopicBoardFilterParams | string,
    baselineTimestampOverride?: string,
  ): Promise<HokimTopicBoardResponse> {
    if (!actorContext.districtId) {
      throw new Error('Ҳоким ҳисоби туманга бириктирилмаган.');
    }

    const district = await this.db.query.districts.findFirst({
      where: eq(districts.id, actorContext.districtId),
    });

    if (!district) {
      throw new Error('Туман топилмади.');
    }

    const filterParams: HokimTopicBoardFilterParams =
      typeof paramsOrCalendarDay === 'string'
        ? {
            calendarDay: paramsOrCalendarDay,
            baselineTimestamp: baselineTimestampOverride,
          }
        : paramsOrCalendarDay || {};

    const { datePredicate, resolvedCalendarDay } = resolveDateBoundary({
      dateScope: filterParams.dateScope,
      dateFrom: filterParams.dateFrom,
      dateTo: filterParams.dateTo,
      calendarDay: filterParams.calendarDay,
    });

    const currentVisitDate = new Date();
    let visitBaselineTimestamp: string | null = null;

    const baseline = filterParams.baselineTimestamp || baselineTimestampOverride;

    if (baseline) {
      // In-session background / manual refresh: preserve established baseline and skip duplicate visit insertion
      visitBaselineTimestamp = baseline;
    } else {
      // Initial cold load: capture preceding visit boundary and record new visit record
      const prevVisit = await this.db.query.userDashboardVisits.findFirst({
        where: and(
          eq(userDashboardVisits.userId, actorContext.id),
          eq(userDashboardVisits.districtId, actorContext.districtId),
        ),
        orderBy: [desc(userDashboardVisits.visitedAt)],
      });

      visitBaselineTimestamp = prevVisit ? prevVisit.visitedAt.toISOString() : null;

      await this.db.insert(userDashboardVisits).values({
        id: `vis_${crypto.randomUUID()}`,
        userId: actorContext.id,
        districtId: actorContext.districtId,
        visitedAt: currentVisitDate,
        createdAt: currentVisitDate,
      });
    }

    const hasProcessingDelay = await this.checkProcessingDelay(
      actorContext.districtId,
      resolvedCalendarDay,
    );

    // Determine active lanes preserving canonical order
    const requestedLanes =
      filterParams.lanes && filterParams.lanes.length > 0
        ? CANONICAL_LANES.filter((l) => filterParams.lanes!.includes(l))
        : CANONICAL_LANES;

    const activeLanes = requestedLanes.length > 0 ? requestedLanes : CANONICAL_LANES;

    // Query active lanes in parallel
    const laneResults = await Promise.all(
      activeLanes.map(async (lane) => {
        const laneData = await this.queryLaneData({
          districtId: actorContext.districtId,
          datePredicate,
          mahallaName: filterParams.mahallaName,
          lane,
          limit: 20,
          cursor: undefined,
          baselineTimestamp: visitBaselineTimestamp ?? undefined,
          search: filterParams.search,
        });

        const totalCount = await this.countLaneTopics({
          districtId: actorContext.districtId,
          datePredicate,
          mahallaName: filterParams.mahallaName,
          lane,
          search: filterParams.search,
        });

        return {
          lane,
          data: {
            lane,
            ...laneData,
            totalCount,
          },
        };
      }),
    );

    const lanesRecord = {} as Record<QualifyingLane, HokimLaneBoardData>;
    for (const res of laneResults) {
      lanesRecord[res.lane] = res.data;
    }

    return {
      districtId: district.id,
      districtName: district.name,
      calendarDay: resolvedCalendarDay,
      visitBaselineTimestamp,
      currentVisitTimestamp: currentVisitDate.toISOString(),
      serverEvaluatedAt: currentVisitDate.toISOString(),
      hasProcessingDelay,
      lanes: lanesRecord,
    };
  }

  /**
   * Checks if unprocessed intake records or active processing jobs older than 30s indicate a processing delay.
   */
  async checkProcessingDelay(districtId: string, calendarDay: string): Promise<boolean> {
    try {
      // 1. Check pgboss active/queued jobs older than 30s for this district
      const bossDelay = await this.db.execute(sql`
        SELECT 1 FROM pgboss.job
        WHERE name IN (
          'telegram-content-qualification',
          'telegram-semantic-relevance',
          'telegram-topic-assignment',
          'telegram-topic-projection'
        )
        AND state IN ('created', 'retry', 'active')
        AND (data->>'districtId' = ${districtId})
        AND createdon < NOW() - INTERVAL '30 seconds'
        LIMIT 1;
      `);
      if (bossDelay.rows && bossDelay.rows.length > 0) {
        return true;
      }
    } catch {
      // pgboss table might not exist in certain test setups or schemas
    }

    try {
      let intakeDayPredicate = sql`tir.calendar_day = ${calendarDay}`;
      let topicDayPredicate = sql`t.calendar_day = ${calendarDay}`;
      if (calendarDay.includes('..')) {
        const [fromDay, toDay] = calendarDay.split('..');
        intakeDayPredicate = sql`tir.calendar_day >= ${fromDay} AND tir.calendar_day <= ${toDay}`;
        topicDayPredicate = sql`t.calendar_day >= ${fromDay} AND t.calendar_day <= ${toDay}`;
      }

      // 2. Check unprocessed intake records older than 30s
      const intakeDelay = await this.db.execute(sql`
        SELECT 1 FROM telegram_intake_records tir
        WHERE tir.district_id = ${districtId}
          AND ${intakeDayPredicate}
          AND tir.created_at < NOW() - INTERVAL '30 seconds'
          AND NOT EXISTS (
            SELECT 1 FROM ai_operations ao 
            WHERE ao.district_id = tir.district_id 
              AND ao.target_id = tir.id
          )
        LIMIT 1;
      `);
      if (intakeDelay.rows && intakeDelay.rows.length > 0) {
        return true;
      }

      // 3. Check active topics without completed projection or with outdated projection older than 30s
      const projectionDelay = await this.db.execute(sql`
        SELECT 1 FROM topics t
        LEFT JOIN topic_projections tp ON tp.topic_id = t.id
        WHERE t.district_id = ${districtId}
          AND ${topicDayPredicate}
          AND t.status = 'ACTIVE'
          AND (tp.id IS NULL OR tp.updated_at < t.updated_at - INTERVAL '30 seconds')
          AND t.created_at < NOW() - INTERVAL '30 seconds'
        LIMIT 1;
      `);
      if (projectionDelay.rows && projectionDelay.rows.length > 0) {
        return true;
      }
    } catch {
      // Fallback safely to false if query fails
    }

    return false;
  }

  /**
   * Retrieves a paginated batch of topics for a single lane using deterministic keyset pagination.
   */
  async getLaneBatch(params: {
    actorContext: { id: string; districtId: string; role: string };
    lane: QualifyingLane;
    search?: string;
    dateScope?: DateFilterScope;
    dateFrom?: string;
    dateTo?: string;
    mahallaName?: string;
    calendarDay?: string;
    cursor?: string;
    limit?: number;
    baselineTimestamp?: string;
  }): Promise<HokimLaneResponse> {
    const { actorContext, lane, cursor, baselineTimestamp, mahallaName, search } = params;
    const limit = params.limit ?? 20;

    if (!actorContext.districtId) {
      throw new Error('Ҳоким ҳисоби туманга бириктирилмаган.');
    }

    const { datePredicate } = resolveDateBoundary({
      dateScope: params.dateScope,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      calendarDay: params.calendarDay,
    });

    const laneData = await this.queryLaneData({
      districtId: actorContext.districtId,
      datePredicate,
      mahallaName,
      lane,
      limit,
      cursor,
      baselineTimestamp,
      search,
    });

    return {
      lane,
      topics: laneData.topics,
      nextCursor: laneData.nextCursor,
      hasNextPage: laneData.hasNextPage,
    };
  }

  private async queryLaneData(params: {
    districtId: string;
    datePredicate: ReturnType<typeof sql>;
    mahallaName?: string;
    lane: QualifyingLane;
    limit: number;
    cursor?: string;
    baselineTimestamp?: string;
    search?: string;
  }): Promise<{ topics: TopicCardItem[]; nextCursor: string | null; hasNextPage: boolean }> {
    const { districtId, datePredicate, mahallaName, lane, limit, cursor, baselineTimestamp, search } = params;

    let cursorPredicate = sql``;
    if (cursor) {
      const decoded = decodeKeysetCursor(cursor);
      if (decoded) {
        const cursorDate = new Date(decoded.t);
        cursorPredicate = sql`AND (
          date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) < ${cursorDate}
          OR (date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) = ${cursorDate} AND t.id < ${decoded.id})
        )`;
      }
    }

    let mahallaPredicate = sql``;
    if (mahallaName && mahallaName.trim() !== '' && mahallaName !== 'all') {
      mahallaPredicate = sql`AND t.mahalla_name = ${mahallaName.trim()}`;
    }

    const lanePredicate =
      lane === 'HOKIM_RELATED'
        ? sql`(tp.is_hokim_related = true OR tp.lanes @> '["HOKIM_RELATED"]'::jsonb OR t.primary_lane = 'HOKIM_RELATED')`
        : sql`(tp.lanes @> ${JSON.stringify([lane])}::jsonb OR t.primary_lane = ${lane})`;

    let searchPredicate = sql``;
    let badgeSelect = sql`NULL::text AS "searchMatchBadge"`;

    const trimmedSearch = search?.trim();
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
        WHEN tp.summary ILIKE ${pattern} THEN NULL
        WHEN EXISTS (
          SELECT 1 FROM accepted_evidence ae 
          WHERE ae.topic_id = t.id 
            AND ae.district_id = ${districtId}
            AND ae.verbatim_text ILIKE ${pattern}
        ) THEN 'evidence'
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
        ELSE NULL 
      END AS "searchMatchBadge"`;
    }

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
        tp.is_hokim_related AS "isHokimRelated", 
        tp.latest_meaningful_activity_timestamp AS "latestMeaningfulActivityTimestamp",
        tp.updated_at AS "projectionUpdatedAt",
        COUNT(ae.id)::int AS "evidenceCount",
        ${badgeSelect}
      FROM topics t
      JOIN topic_projections tp ON tp.topic_id = t.id
      LEFT JOIN accepted_evidence ae ON ae.topic_id = t.id
      WHERE t.district_id = ${districtId}
        AND ${datePredicate}
        ${mahallaPredicate}
        AND t.status = 'ACTIVE'
        AND t.retention_expires_at > NOW()
        AND ${lanePredicate}
        ${cursorPredicate}
        ${searchPredicate}
      GROUP BY t.id, tp.id
      ORDER BY tp.latest_meaningful_activity_timestamp DESC, t.id DESC
      LIMIT ${limit + 1};
    `;

    const result = await this.db.execute<RawTopicRow>(query);
    const rows = result.rows;

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

    const baselineDate = baselineTimestamp ? new Date(baselineTimestamp) : null;

    const topics: TopicCardItem[] = pageRows.map((row) => {
      const allLanes = Array.isArray(row.lanes) && row.lanes.length > 0
        ? row.lanes
        : [row.primaryLane];

      const additionalLanes = allLanes.filter((l) => l !== lane);

      let isNew = false;
      let isUpdated = false;

      if (baselineDate) {
        const createdAtDate = new Date(row.createdAt);
        const projectionUpdatedAtDate = new Date(row.projectionUpdatedAt || row.updatedAt);

        if (createdAtDate > baselineDate) {
          isNew = true;
        } else if (projectionUpdatedAtDate > baselineDate) {
          isUpdated = true;
        }
      }

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
        primaryLane: row.primaryLane,
        lanes: allLanes,
        additionalLanes,
        evidenceCount: Number(row.evidenceCount) || 0,
        latestMeaningfulActivityTimestamp: new Date(
          row.latestMeaningfulActivityTimestamp,
        ).toISOString(),
        isNew,
        isUpdated,
        searchMatchBadge,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      };
    });

    let nextCursor: string | null = null;
    if (hasNextPage && topics.length > 0) {
      const lastItem = topics[topics.length - 1];
      if (lastItem) {
        nextCursor = encodeKeysetCursor(lastItem.latestMeaningfulActivityTimestamp, lastItem.id);
      }
    }

    return {
      topics,
      nextCursor,
      hasNextPage,
    };
  }

  private async countLaneTopics(params: {
    districtId: string;
    datePredicate: ReturnType<typeof sql>;
    mahallaName?: string;
    lane: QualifyingLane;
    search?: string;
  }): Promise<number> {
    const { districtId, datePredicate, mahallaName, lane, search } = params;

    let mahallaPredicate = sql``;
    if (mahallaName && mahallaName.trim() !== '' && mahallaName !== 'all') {
      mahallaPredicate = sql`AND t.mahalla_name = ${mahallaName.trim()}`;
    }

    let searchPredicate = sql``;
    const trimmedSearch = search?.trim();
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
    }

    const lanePredicate =
      lane === 'HOKIM_RELATED'
        ? sql`(tp.is_hokim_related = true OR tp.lanes @> '["HOKIM_RELATED"]'::jsonb OR t.primary_lane = 'HOKIM_RELATED')`
        : sql`(tp.lanes @> ${JSON.stringify([lane])}::jsonb OR t.primary_lane = ${lane})`;

    const countQuery = sql<{ count: number }>`
      SELECT COUNT(DISTINCT t.id)::int AS count
      FROM topics t
      JOIN topic_projections tp ON tp.topic_id = t.id
      WHERE t.district_id = ${districtId}
        AND ${datePredicate}
        ${mahallaPredicate}
        AND t.status = 'ACTIVE'
        AND t.retention_expires_at > NOW()
        AND ${lanePredicate}
        ${searchPredicate};
    `;

    const countResult = await this.db.execute<{ count: number }>(countQuery);
    return Number(countResult.rows[0]?.count ?? 0);
  }

  /**
   * Retrieves distinct, non-empty Mahalla names from telegram groups and topics for the Hokim's district,
   * sorted with Uzbek Cyrillic collation.
   */
  async getDistrictMahallas(actorContext: {
    id: string;
    districtId: string;
    role: string;
  }): Promise<string[]> {
    if (!actorContext.districtId) {
      throw new Error('Ҳоким ҳисоби туманга бириктирилмаган.');
    }

    const result = await this.db.execute<{ mahalla_name: string }>(sql`
      SELECT DISTINCT mahalla_name FROM (
        SELECT mahalla_name 
        FROM district_telegram_groups 
        WHERE district_id = ${actorContext.districtId} 
          AND status != 'FAILED'
        UNION
        SELECT mahalla_name 
        FROM topics 
        WHERE district_id = ${actorContext.districtId}
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

  /**
   * Retrieves compact neutral statistics following the active filter scope
   * and single-roundtrip authoritative PostgreSQL aggregations.
   */
  async getStatistics(
    actorContext: {
      id: string;
      districtId: string;
      role: string;
    },
    params: HokimTopicStatisticsQueryOutput & { search?: string },
  ): Promise<HokimTopicStatisticsResponse> {
    if (!actorContext.districtId) {
      throw new Error('Ҳоким ҳисоби туманга бириктирилмаган.');
    }
    const districtId = actorContext.districtId;

    const districtResult = await this.db
      .select({ name: districts.name })
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);
    const districtName = districtResult[0]?.name || 'Номаълум туман';

    const { datePredicate, resolvedCalendarDay } = resolveDateBoundary(params);

    let mahallaPredicate = sql``;
    if (params.mahallaName && params.mahallaName.trim() !== '' && params.mahallaName !== 'all') {
      mahallaPredicate = sql`AND t.mahalla_name = ${params.mahallaName.trim()}`;
    }

    const selectedLanes: QualifyingLane[] =
      params.lanes && Array.isArray(params.lanes) && params.lanes.length > 0
        ? params.lanes
        : CANONICAL_LANES;

    const laneClauses = selectedLanes.map((l) => {
      if (l === 'HOKIM_RELATED') {
        return sql`(tp.is_hokim_related = true OR tp.lanes @> '["HOKIM_RELATED"]'::jsonb OR t.primary_lane = 'HOKIM_RELATED')`;
      }
      return sql`(tp.lanes @> ${JSON.stringify([l])}::jsonb OR t.primary_lane = ${l})`;
    });
    const lanePredicate = sql.join(laneClauses, sql` OR `);

    let searchPredicate = sql``;
    const trimmedSearch = typeof params.search === 'string' ? params.search.trim() : undefined;
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
    }

    const statsQuery = sql`
      WITH filtered_topics AS (
        SELECT 
          t.id,
          t.mahalla_name,
          t.primary_lane,
          tp.lanes,
          tp.is_hokim_related
        FROM topics t
        JOIN topic_projections tp ON tp.topic_id = t.id
        WHERE t.district_id = ${districtId}
          AND t.status = 'ACTIVE'
          AND t.retention_expires_at > NOW()
          AND ${datePredicate}
          ${mahallaPredicate}
          AND (${lanePredicate})
          ${searchPredicate}
      ),
      evidence_counts AS (
        SELECT 
          ae.topic_id,
          COUNT(DISTINCT ae.id)::int as count
        FROM accepted_evidence ae
        WHERE ae.topic_id IN (SELECT id FROM filtered_topics)
          AND ae.district_id = ${districtId}
        GROUP BY ae.topic_id
      ),
      mahalla_topic_counts AS (
        SELECT 
          mahalla_name, 
          COUNT(DISTINCT id)::int as topic_count
        FROM filtered_topics
        WHERE mahalla_name IS NOT NULL AND TRIM(mahalla_name) != ''
        GROUP BY mahalla_name
      ),
      district_mahallas_total AS (
        SELECT COUNT(DISTINCT mahalla_name)::int as total_mahallas_count
        FROM (
          SELECT mahalla_name FROM district_telegram_groups WHERE district_id = ${districtId} AND status != 'FAILED'
          UNION
          SELECT mahalla_name FROM topics WHERE district_id = ${districtId} AND status = 'ACTIVE' AND retention_expires_at > NOW()
        ) d_mahallas
        WHERE mahalla_name IS NOT NULL AND TRIM(mahalla_name) != ''
      )
      SELECT 
        COUNT(DISTINCT ft.id)::int as total_unique_topics,
        COUNT(DISTINCT CASE WHEN ft.is_hokim_related = true OR ft.lanes @> '["HOKIM_RELATED"]'::jsonb OR ft.primary_lane = 'HOKIM_RELATED' THEN ft.id END)::int as hokim_topics_count,
        COALESCE(SUM(CASE WHEN ft.is_hokim_related = true OR ft.lanes @> '["HOKIM_RELATED"]'::jsonb OR ft.primary_lane = 'HOKIM_RELATED' THEN ec.count ELSE 0 END), 0)::int as hokim_evidence_count,
        COUNT(DISTINCT CASE WHEN ft.mahalla_name IS NOT NULL AND TRIM(ft.mahalla_name) != '' THEN ft.mahalla_name END)::int as active_mahallas_count,
        COALESCE(SUM(ec.count), 0)::int as total_accepted_evidence_count,
        COUNT(DISTINCT CASE WHEN ft.lanes IS NOT NULL AND jsonb_typeof(ft.lanes) = 'array' AND jsonb_array_length(ft.lanes) > 1 THEN ft.id END)::int as multi_lane_topics_count,
        COUNT(DISTINCT CASE WHEN COALESCE(ec.count, 0) > 1 THEN ft.id END)::int as multi_evidence_topics_count,
        COUNT(DISTINCT CASE WHEN ft.lanes @> '["WATER"]'::jsonb OR ft.primary_lane = 'WATER' THEN ft.id END)::int as water_count,
        COUNT(DISTINCT CASE WHEN ft.lanes @> '["ELECTRICITY"]'::jsonb OR ft.primary_lane = 'ELECTRICITY' THEN ft.id END)::int as electricity_count,
        COUNT(DISTINCT CASE WHEN ft.lanes @> '["GAS"]'::jsonb OR ft.primary_lane = 'GAS' THEN ft.id END)::int as gas_count,
        COUNT(DISTINCT CASE WHEN ft.lanes @> '["WASTE"]'::jsonb OR ft.primary_lane = 'WASTE' THEN ft.id END)::int as waste_count,
        COALESCE((SELECT jsonb_object_agg(mahalla_name, topic_count) FROM mahalla_topic_counts), '{}'::jsonb) as mahalla_counts,
        COALESCE((SELECT total_mahallas_count FROM district_mahallas_total), 0)::int as total_district_mahallas_count
      FROM filtered_topics ft
      LEFT JOIN evidence_counts ec ON ec.topic_id = ft.id;
    `;

    const result = await this.db.execute<{
      total_unique_topics: number;
      hokim_topics_count: number;
      hokim_evidence_count: number;
      active_mahallas_count: number;
      total_accepted_evidence_count: number;
      multi_lane_topics_count: number;
      multi_evidence_topics_count: number;
      water_count: number;
      electricity_count: number;
      gas_count: number;
      waste_count: number;
      mahalla_counts: Record<string, number> | null;
      total_district_mahallas_count: number;
    }>(statsQuery);

    const row = result.rows[0];

    const totalUniqueTopics = Number(row?.total_unique_topics ?? 0);
    const hokimRelatedTopics = Number(row?.hokim_topics_count ?? 0);
    const hokimEvidenceCount = Number(row?.hokim_evidence_count ?? 0);
    const activeMahallasCount = Number(row?.active_mahallas_count ?? 0);
    const totalAcceptedEvidenceCount = Number(row?.total_accepted_evidence_count ?? 0);
    const multiLaneTopicCount = Number(row?.multi_lane_topics_count ?? 0);
    const multiEvidenceTopicCount = Number(row?.multi_evidence_topics_count ?? 0);
    const totalDistrictMahallasCount = Number(row?.total_district_mahallas_count ?? 0);

    // Compute Card 4 (Service Lane or Multi-Lane)
    const activeServiceLanes = selectedLanes.filter(
      (l): l is 'WATER' | 'ELECTRICITY' | 'GAS' | 'WASTE' =>
        l === 'WATER' || l === 'ELECTRICITY' || l === 'GAS' || l === 'WASTE',
    );

    let card4: TopicStatisticCard4;
    if (activeServiceLanes.length < 2) {
      card4 = {
        mode: 'multi_lane_topics',
        multiLaneTopicCount,
      };
    } else {
      const serviceCounts: Record<'WATER' | 'ELECTRICITY' | 'GAS' | 'WASTE', number> = {
        WATER: Number(row?.water_count ?? 0),
        ELECTRICITY: Number(row?.electricity_count ?? 0),
        GAS: Number(row?.gas_count ?? 0),
        WASTE: Number(row?.waste_count ?? 0),
      };

      let maxCount = 0;
      for (const lane of activeServiceLanes) {
        const c = serviceCounts[lane];
        if (c > maxCount) {
          maxCount = c;
        }
      }

      if (maxCount === 0) {
        card4 = {
          mode: 'most_active_service_lane',
          leaderLane: null,
          leaderTopicCount: 0,
          isTie: false,
          tiedCount: 0,
          isZero: true,
        };
      } else {
        const tied = activeServiceLanes.filter((lane) => serviceCounts[lane] === maxCount);
        if (tied.length > 1) {
          card4 = {
            mode: 'most_active_service_lane',
            leaderLane: null,
            leaderTopicCount: maxCount,
            isTie: true,
            tiedCount: tied.length,
            isZero: false,
          };
        } else {
          card4 = {
            mode: 'most_active_service_lane',
            leaderLane: tied[0] ?? null,
            leaderTopicCount: maxCount,
            isTie: false,
            tiedCount: 0,
            isZero: false,
          };
        }
      }
    }

    // Compute Card 5 (Mahalla or Multi-Evidence)
    const isSingleMahallaScope =
      (params.mahallaName &&
        params.mahallaName.trim() !== '' &&
        params.mahallaName.trim() !== 'all') ||
      totalDistrictMahallasCount <= 1;

    let card5: TopicStatisticCard5;
    if (isSingleMahallaScope) {
      card5 = {
        mode: 'multi_evidence_topics',
        multiEvidenceTopicCount,
      };
    } else {
      const rawMahallaCounts = (row?.mahalla_counts ?? {}) as Record<string, number>;
      const mahallaEntries = Object.entries(rawMahallaCounts).filter(
        ([name, count]) => name && name.trim() !== '' && Number(count) > 0,
      );

      if (mahallaEntries.length === 0 || totalUniqueTopics === 0) {
        card5 = {
          mode: 'most_active_mahalla',
          leaderMahalla: null,
          leaderTopicCount: 0,
          isTie: false,
          tiedCount: 0,
          isZero: true,
        };
      } else {
        let maxCount = 0;
        for (const [, count] of mahallaEntries) {
          const c = Number(count);
          if (c > maxCount) {
            maxCount = c;
          }
        }

        if (maxCount === 0) {
          card5 = {
            mode: 'most_active_mahalla',
            leaderMahalla: null,
            leaderTopicCount: 0,
            isTie: false,
            tiedCount: 0,
            isZero: true,
          };
        } else {
          const tied = mahallaEntries
            .filter(([, count]) => Number(count) === maxCount)
            .map(([name]) => name);

          if (tied.length > 1) {
            card5 = {
              mode: 'most_active_mahalla',
              leaderMahalla: null,
              leaderTopicCount: maxCount,
              isTie: true,
              tiedCount: tied.length,
              isZero: false,
            };
          } else {
            card5 = {
              mode: 'most_active_mahalla',
              leaderMahalla: tied[0] ?? null,
              leaderTopicCount: maxCount,
              isTie: false,
              tiedCount: 0,
              isZero: false,
            };
          }
        }
      }
    }

    return {
      districtId,
      districtName,
      calendarDay: resolvedCalendarDay,
      serverEvaluatedAt: new Date().toISOString(),
      totalUniqueTopics,
      hokimRelatedTopics,
      hokimEvidenceCount,
      activeMahallasCount,
      totalAcceptedEvidenceCount,
      card4,
      card5,
    };
  }
}
