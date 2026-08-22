import { z } from 'zod';
import { QualifyingLaneEnum, type QualifyingLane } from './semantic-relevance-contracts.js';

export const TopicMatchingDecisionEnum = z.enum([
  'MATCH_EXISTING_TOPIC',
  'NEW_TOPIC',
  'UNASSIGNABLE_VAGUE',
]);
export type TopicMatchingDecision = z.infer<typeof TopicMatchingDecisionEnum>;

export const TopicMatchingResultSchema = z
  .object({
    decision: TopicMatchingDecisionEnum.describe(
      'Whether the candidate matches an existing same-day Topic (MATCH_EXISTING_TOPIC), seeds a new independent Topic (NEW_TOPIC), or is an unassignable vague fragment (UNASSIGNABLE_VAGUE)',
    ),
    matched_topic_id: z
      .string()
      .nullable()
      .describe(
        'Canonical topic ID (e.g. top_...) if decision is MATCH_EXISTING_TOPIC, otherwise null',
      ),
    primary_lane: QualifyingLaneEnum.nullable().describe(
      'Primary municipal service or leadership lane (WATER, ELECTRICITY, GAS, WASTE, HOKIM_RELATED) if decision is NEW_TOPIC, otherwise null',
    ),
    reasoning: z
      .string()
      .max(300)
      .describe('Brief 1-sentence explanation of topic assignment decision'),
  })
  .refine(
    (data) => {
      if (data.decision === 'MATCH_EXISTING_TOPIC') {
        return (
          data.matched_topic_id !== null &&
          data.matched_topic_id.length > 0 &&
          data.primary_lane === null
        );
      }
      if (data.decision === 'NEW_TOPIC') {
        return data.matched_topic_id === null && data.primary_lane !== null;
      }
      if (data.decision === 'UNASSIGNABLE_VAGUE') {
        return data.matched_topic_id === null && data.primary_lane === null;
      }
      return false;
    },
    {
      message:
        'Inconsistent topic matching output: MATCH_EXISTING_TOPIC requires matched_topic_id and null primary_lane; NEW_TOPIC requires null matched_topic_id and non-null primary_lane; UNASSIGNABLE_VAGUE requires null for both',
    },
  );

export type TopicMatchingResult = z.infer<typeof TopicMatchingResultSchema>;
export { QualifyingLane, QualifyingLaneEnum };
