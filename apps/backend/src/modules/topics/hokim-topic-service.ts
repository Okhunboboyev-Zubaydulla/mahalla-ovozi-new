import type { DbClient } from '../../adapters/db/client.js';
import type {
  QualifyingLane,
  HokimTopicBoardResponse,
  HokimLaneResponse,
  DateFilterScope,
  HokimTopicStatisticsQueryOutput,
  HokimTopicStatisticsResponse,
} from '@mahalla-ovozi/api-contracts';
import {
  CANONICAL_LANES,
  TopicKeysetCursorPayload,
  encodeTopicKeysetCursor,
  decodeTopicKeysetCursor,
  queryDistrictMahallas,
  queryHokimBoard,
  queryHokimLaneBatch,
  checkProcessingDelay,
  queryHokimStatistics,
  resolveDateBoundary,
  escapeLikePattern,
} from './topic-query-engine.js';

export { resolveDateBoundary, escapeLikePattern, CANONICAL_LANES };

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

// Keyset cursor aliases
export type KeysetCursorPayload = TopicKeysetCursorPayload;
export const encodeKeysetCursor = encodeTopicKeysetCursor;
export const decodeKeysetCursor = decodeTopicKeysetCursor;

export class HokimTopicService {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  /**
   * Retrieves today's or filtered multi-lane unified board for the authenticated Hokim's district,
   * evaluating freshness against baseline timestamp or preceding visit.
   */
  async getTodayBoard(
    actorContext: { id: string; districtId: string; role: string },
    paramsOrCalendarDay?: HokimTopicBoardFilterParams | string,
    baselineTimestampOverride?: string,
  ): Promise<HokimTopicBoardResponse> {
    return queryHokimBoard(this.db, actorContext, paramsOrCalendarDay, baselineTimestampOverride);
  }

  /**
   * Checks if unprocessed intake records or active processing jobs older than 30s indicate a processing delay.
   */
  async checkProcessingDelay(districtId: string, calendarDay: string): Promise<boolean> {
    return checkProcessingDelay(this.db, districtId, calendarDay);
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
    return queryHokimLaneBatch(this.db, params);
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
    return queryDistrictMahallas(this.db, actorContext.districtId);
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
    return queryHokimStatistics(this.db, actorContext, params);
  }
}
