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
  dateScope?: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  mahallaName?: string;
  calendarDay?: string;
  cursor?: string;
  limit?: number;
  baselineTimestamp?: string;
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
      !Number.isNaN(new Date(parsed.t).getTime()) &&
      typeof parsed.id === 'string' &&
      parsed.id.length > 0
    ) {
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
        });

        const totalCount = await this.countLaneTopics({
          districtId: actorContext.districtId,
          datePredicate,
          mahallaName: filterParams.mahallaName,
          lane,
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
      // 2. Check unprocessed intake records older than 30s
      const intakeDelay = await this.db.execute(sql`
        SELECT 1 FROM telegram_intake_records tir
        WHERE tir.district_id = ${districtId}
          AND tir.calendar_day = ${calendarDay}
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
          AND t.calendar_day = ${calendarDay}
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
    dateScope?: DateFilterScope;
    dateFrom?: string;
    dateTo?: string;
    mahallaName?: string;
    calendarDay?: string;
    cursor?: string;
    limit?: number;
    baselineTimestamp?: string;
  }): Promise<HokimLaneResponse> {
    const { actorContext, lane, cursor, baselineTimestamp, mahallaName } = params;
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
  }): Promise<{ topics: TopicCardItem[]; nextCursor: string | null; hasNextPage: boolean }> {
    const { districtId, datePredicate, mahallaName, lane, limit, cursor, baselineTimestamp } = params;

    let cursorPredicate = sql``;
    if (cursor) {
      const decoded = decodeKeysetCursor(cursor);
      if (decoded) {
        const cursorDate = new Date(decoded.t);
        cursorPredicate = sql`AND (
          tp.latest_meaningful_activity_timestamp < ${cursorDate}
          OR (tp.latest_meaningful_activity_timestamp = ${cursorDate} AND t.id < ${decoded.id})
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
        COUNT(ae.id)::int AS "evidenceCount"
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
  }): Promise<number> {
    const { districtId, datePredicate, mahallaName, lane } = params;

    let mahallaPredicate = sql``;
    if (mahallaName && mahallaName.trim() !== '' && mahallaName !== 'all') {
      mahallaPredicate = sql`AND t.mahalla_name = ${mahallaName.trim()}`;
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
        AND ${lanePredicate};
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
