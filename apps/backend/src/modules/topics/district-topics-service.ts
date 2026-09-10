import { eq } from 'drizzle-orm';
import type { DbClient } from '../../adapters/db/client.js';
import { districts } from '../../adapters/db/schema/index.js';
import type {
  DistrictTopicsSearchBodyOutput,
  DistrictTopicsPageResponse,
  TopicEvidenceResponse,
  TopicEvidenceQueryOutput,
} from '@mahalla-ovozi/api-contracts';
import {
  TopicEvidenceService,
  TopicNotFoundError,
} from './topic-evidence-service.js';
import {
  DistrictNotFoundError,
  DistrictRequiredError,
  InvalidCursorError,
  TopicKeysetCursorPayload,
  encodeTopicKeysetCursor,
  decodeTopicKeysetCursor,
  queryDistrictMahallas,
  queryDistrictTopicsPage,
  resolveDateBoundary,
  escapeLikePattern,
} from './topic-query-engine.js';

export {
  escapeLikePattern,
  resolveDateBoundary,
  TopicNotFoundError,
  DistrictNotFoundError,
  DistrictRequiredError,
  InvalidCursorError,
  encodeTopicKeysetCursor,
  decodeTopicKeysetCursor,
};
export type { TopicKeysetCursorPayload };

// Backward compatibility aliases
export type DistrictTopicKeysetCursorPayload = TopicKeysetCursorPayload;
export const encodeDistrictTopicKeysetCursor = encodeTopicKeysetCursor;
export const decodeDistrictTopicKeysetCursor = decodeTopicKeysetCursor;

export class DistrictTopicsService {
  private readonly db: DbClient;
  private readonly topicEvidenceService: TopicEvidenceService;

  constructor(db: DbClient) {
    this.db = db;
    this.topicEvidenceService = new TopicEvidenceService(db);
  }

  /**
   * Retrieves paginated, filterable, searchable canonical Topics for an explicitly selected District.
   */
  async getDistrictTopics(params: {
    districtId: string;
    filter: DistrictTopicsSearchBodyOutput;
  }): Promise<DistrictTopicsPageResponse> {
    return queryDistrictTopicsPage(this.db, params);
  }

  /**
   * Retrieves complete retained Accepted Evidence for a specific Topic within the explicit District scope.
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
    return queryDistrictMahallas(this.db, districtId);
  }
}
