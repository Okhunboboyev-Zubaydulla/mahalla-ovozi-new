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
} from '@mahalla-ovozi/api-contracts';
import { getTashkentCalendarDay } from '../telegram-intake/timezone-util.js';

export const CANONICAL_LANES: QualifyingLane[] = [
  'HOKIM_RELATED',
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
];

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
   * Retrieves today's 5-lane unified board for the authenticated Hokim's district,
   * evaluating freshness against the baseline timestamp (or preceding visit) and
   * returning server-backed evaluation time and processing delay status.
   */
  async getTodayBoard(
    actorContext: { id: string; districtId: string; role: string },
    calendarDayOverride?: string,
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

    const calendarDay =
      calendarDayOverride || getTashkentCalendarDay(Math.floor(Date.now() / 1000));

    const currentVisitDate = new Date();
    let visitBaselineTimestamp: string | null = null;

    if (baselineTimestampOverride) {
      // In-session background / manual refresh: preserve established baseline and skip duplicate visit insertion
      visitBaselineTimestamp = baselineTimestampOverride;
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
      calendarDay,
    );

    // Query 5 canonical lanes in parallel
    const laneResults = await Promise.all(
      CANONICAL_LANES.map(async (lane) => {
        const laneData = await this.queryLaneData({
          districtId: actorContext.districtId,
          calendarDay,
          lane,
          limit: 20,
          cursor: undefined,
          baselineTimestamp: visitBaselineTimestamp ?? undefined,
        });

        const totalCount = await this.countLaneTopics({
          districtId: actorContext.districtId,
          calendarDay,
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
      calendarDay,
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
    calendarDay?: string;
    cursor?: string;
    limit?: number;
    baselineTimestamp?: string;
  }): Promise<HokimLaneResponse> {
    const { actorContext, lane, cursor, baselineTimestamp } = params;
    const limit = params.limit ?? 20;

    if (!actorContext.districtId) {
      throw new Error('Ҳоким ҳисоби туманга бириктирилмаган.');
    }

    const calendarDay =
      params.calendarDay || getTashkentCalendarDay(Math.floor(Date.now() / 1000));

    const laneData = await this.queryLaneData({
      districtId: actorContext.districtId,
      calendarDay,
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
    calendarDay: string;
    lane: QualifyingLane;
    limit: number;
    cursor?: string;
    baselineTimestamp?: string;
  }): Promise<{ topics: TopicCardItem[]; nextCursor: string | null; hasNextPage: boolean }> {
    const { districtId, calendarDay, lane, limit, cursor, baselineTimestamp } = params;

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
        AND t.calendar_day = ${calendarDay}
        AND t.status = 'ACTIVE'
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
    calendarDay: string;
    lane: QualifyingLane;
  }): Promise<number> {
    const { districtId, calendarDay, lane } = params;

    const lanePredicate =
      lane === 'HOKIM_RELATED'
        ? sql`(tp.is_hokim_related = true OR tp.lanes @> '["HOKIM_RELATED"]'::jsonb OR t.primary_lane = 'HOKIM_RELATED')`
        : sql`(tp.lanes @> ${JSON.stringify([lane])}::jsonb OR t.primary_lane = ${lane})`;

    const countQuery = sql<{ count: number }>`
      SELECT COUNT(DISTINCT t.id)::int AS count
      FROM topics t
      JOIN topic_projections tp ON tp.topic_id = t.id
      WHERE t.district_id = ${districtId}
        AND t.calendar_day = ${calendarDay}
        AND t.status = 'ACTIVE'
        AND ${lanePredicate};
    `;

    const countResult = await this.db.execute<{ count: number }>(countQuery);
    return Number(countResult.rows[0]?.count ?? 0);
  }
}
