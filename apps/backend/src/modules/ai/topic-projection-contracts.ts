import { z } from 'zod';
import {
  QualifyingLaneEnum,
  type QualifyingLane,
} from './semantic-relevance-contracts.js';
import type { MahallaDailySnapshot } from './context-snapshot.js';
import type { AiGatewayResult } from './types.js';

export { QualifyingLaneEnum, type QualifyingLane };

/**
 * Validates if the given text contains authentic Uzbek Cyrillic characters.
 * Matches standard Cyrillic characters plus Uzbek specific Cyrillic letters: қ, ғ, ҳ, ў.
 * Requires Cyrillic characters to constitute at least 70% of all alphabetic characters.
 */
export function isUzbekCyrillic(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const cyrillicMatches = text.match(/[а-яёқғҳў]/gi) || [];
  const alphabeticMatches = text.match(/[a-zа-яёқғҳў]/gi) || [];
  if (alphabeticMatches.length === 0) {
    return cyrillicMatches.length > 0;
  }
  return cyrillicMatches.length / alphabeticMatches.length >= 0.7;
}

export const TopicProjectionResultSchema = z
  .object({
    summary: z
      .string()
      .min(1)
      .describe(
        'Concise 1-3 sentence cautious Uzbek Cyrillic summary of the situation preserving reported status, disagreements, or recurrences',
      ),
    lanes: z
      .array(QualifyingLaneEnum)
      .min(1)
      .transform((l) => Array.from(new Set(l)))
      .describe(
        'Non-empty array of applicable municipal/governance lanes. Must include the immutable primaryLane of the target Topic.',
      ),
    anchor_evidence_id: z
      .string()
      .min(1)
      .describe(
        'The evidence ID of the latest self-contained meaningful report belonging strictly to the target Topic',
      ),
    anchor_quote: z
      .string()
      .min(1)
      .describe('Exact quotation or key excerpt from the anchor evidence item'),
    latest_meaningful_activity_timestamp: z
      .string()
      .datetime()
      .describe(
        'ISO-8601 timestamp strictly matching the originalTimestamp of an Accepted Evidence item belonging to the target Topic',
      ),
    attribution: z
      .string()
      .min(1)
      .describe(
        'Neutral, cautious attribution (e.g. "Маҳалла аҳолиси хабарига кўра" or permitted resident username/display name)',
      ),
    is_hokim_related: z
      .boolean()
      .describe(
        'Must be true if and only if HOKIM_RELATED is present in the lanes array',
      ),
  })
  .refine(
    (data) => data.is_hokim_related === data.lanes.includes('HOKIM_RELATED'),
    {
      message:
        'is_hokim_related must be true if and only if HOKIM_RELATED is present in lanes',
      path: ['is_hokim_related'],
    },
  );

export type TopicProjectionResult = z.infer<typeof TopicProjectionResultSchema>;

export interface TopicProjectionInput {
  topicId: string;
  primaryLane: QualifyingLane;
  generation: number;
  snapshot: MahallaDailySnapshot;
  profileId?: string;
}

export interface TopicProjectionEvaluation {
  summary: string;
  lanes: QualifyingLane[];
  primaryLane: QualifyingLane;
  anchorEvidenceId: string;
  anchorQuote: string;
  latestMeaningfulActivityTimestamp: string;
  attribution: string;
  isHokimRelated: boolean;
  generation: number;
  aiResult: AiGatewayResult<TopicProjectionResult>;
}
