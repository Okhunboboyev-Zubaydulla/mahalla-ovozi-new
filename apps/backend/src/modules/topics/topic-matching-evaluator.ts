import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import {
  QualifyingLaneSchema,
  type QualifyingLane,
} from '@mahalla-ovozi/api-contracts';
import type { DbClient } from '../../adapters/db/client.js';
import { acceptedEvidence } from '../../adapters/db/schema/accepted-evidence.js';
import type { AiGatewayPort } from '../ai/ai-gateway.js';
import type { MahallaDailySnapshot, AcceptedEvidenceItem } from '../ai/context-snapshot.js';
import type { TelegramReplyMetadata } from '@mahalla-ovozi/api-contracts';
import type { AiGatewayResult } from '../ai/types.js';

export const QualifyingLaneEnum = QualifyingLaneSchema;
export { type QualifyingLane };

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


export interface EvaluateTopicAssignmentInput {
  candidateText: string;
  telegramMessageId: string;
  originalTimestamp: string;
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  replyMetadata: TelegramReplyMetadata | null;
  relevantLanes: QualifyingLane[];
  relevanceReasoning?: string;
  snapshot: MahallaDailySnapshot;
  profileId?: string;
}

/**
 * Direct Telegram Reply Fast Matcher (AC 2, 3 / Pure DB resolution)
 * Searches accepted_evidence for the parent message matching the candidate's reply target
 * within the exact same district, mahalla, calendar day, and Telegram chat.
 * Returns the parent's canonical topicId if found, or null otherwise.
 */
export async function findDirectReplyTopic(
  db: DbClient,
  districtId: string,
  mahallaName: string,
  calendarDay: string,
  telegramChatId: string,
  replyToMessageId: string,
): Promise<string | null> {
  const [parentRecord] = await db
    .select({ topicId: acceptedEvidence.topicId })
    .from(acceptedEvidence)
    .where(
      and(
        eq(acceptedEvidence.districtId, districtId),
        eq(acceptedEvidence.telegramChatId, telegramChatId),
        eq(acceptedEvidence.telegramMessageId, replyToMessageId),
        eq(acceptedEvidence.mahallaName, mahallaName),
        eq(acceptedEvidence.calendarDay, calendarDay),
      ),
    )
    .limit(1);

  return parentRecord?.topicId ?? null;
}

export const TOPIC_MATCHING_SYSTEM_PROMPT = `You are the Topic Assignment & Clustering Engine for Mahalla Ovozi, an AI platform monitoring neighborhood Telegram groups in Uzbekistan.
Your objective is to evaluate relevance-qualified candidate messages and assign them to an existing same-day Mahalla Topic or seed a new independent Topic.

### DOMAIN CONTEXT & LANGUAGE
- Neighborhood Telegram groups in Uzbekistan.
- Messages may be in Uzbek (Latin or Cyrillic), Russian, or mixed colloquial forms (e.g. "svet o'chdi", "давление паст", "мусор тўлиб кетган", "ток 160V").
- All evidence and topics are strictly bounded to the same District, Mahalla, and calendar day (Asia/Tashkent).

### DECISION CATEGORIES
1. MATCH_EXISTING_TOPIC:
   - The candidate reports progress, updates, voltage drops/spikes ("tok 160V"), resident restoration notices ("svet yondi"), recurrence ("yana o'chdi"), or contradictory resident reports ("bizda bor, sizlarda yo'qmi?") concerning an ACTIVE same-day situation in this Mahalla.
   - When matching an existing topic:
     - "decision": "MATCH_EXISTING_TOPIC"
     - "matched_topic_id": "<existing_topic_id>" (e.g. "top_...")
     - "primary_lane": null
   - Note: The canonical topic's existing primary_lane remains immutable.

2. NEW_TOPIC:
   - The candidate reports an independent civic issue or distinct disruption that does NOT belong to any active topic in the Mahalla today.
   - The candidate must be self-contained (e.g. "Suv quvuri yorildi, ko'chani suv bosdi", "Yana yangi chuqur paydo bo'ldi yo'lda").
   - When seeding a new topic:
     - "decision": "NEW_TOPIC"
     - "matched_topic_id": null
     - "primary_lane": "<LANE>" (must be one of: WATER, ELECTRICITY, GAS, WASTE, HOKIM_RELATED)

3. UNASSIGNABLE_VAGUE:
   - The candidate is a short, ambiguous, or context-dependent fragment (e.g. "Bizda ham", "Qachon beradi?", "Nega unday?") that cannot be linked to any active topic.
   - When discarding as unassignable:
     - "decision": "UNASSIGNABLE_VAGUE"
     - "matched_topic_id": null
     - "primary_lane": null

### DECISION RULES & CONTINUITY
- Situation Continuity: Multiple reports regarding the same underlying service outage or civic incident must be grouped into the same Topic.
- Preservation of Topic Lane: Matching an existing topic never alters that topic's primary lane.
- Independent Incidents: Different public service categories (e.g. electricity outage vs water leak) or distinct incidents on different streets/locations represent separate Topics.
- Fallback & Nearest-Earlier Context: When direct reply is absent or was excluded, evaluate the candidate against all existing topics and nearest-earlier messages in this Mahalla today.

### OUTPUT FORMAT
Respond strictly with valid JSON conforming to the requested schema.`;

export class TopicMatchingEvaluator {
  private aiGateway: AiGatewayPort;

  constructor(aiGateway: AiGatewayPort) {
    this.aiGateway = aiGateway;
  }

  public buildUserPrompt(input: EvaluateTopicAssignmentInput): string {
    const sections: string[] = [];

    // 1. Candidate message
    sections.push(`### CANDIDATE RELEVANT TELEGRAM MESSAGE TO ASSIGN
- Message ID: ${input.telegramMessageId}
- Timestamp: ${input.originalTimestamp}
- Content Type: ${input.contentType}
- Relevant Lanes: [${input.relevantLanes.join(', ')}]
${input.relevanceReasoning ? `- Relevance Reasoning: "${input.relevanceReasoning}"` : ''}
- Verbatim Text: "${input.candidateText}"`);

    // 2. Reply Context (if any)
    if (input.replyMetadata) {
      if (input.replyMetadata.replyToIsForwarded) {
        sections.push(`### REPLY CONTEXT
- Note: Message replies to a forwarded message which was excluded. Evaluate candidate on its own merit against existing same-day topics.`);
      } else {
        sections.push(`### REPLY CONTEXT
- Reply Target Message ID: ${input.replyMetadata.replyToMessageId} (Target was not found in active accepted evidence or was cross-day/cross-district; evaluate via same-day topic matching).`);
      }
    }

    // 3. Existing Same-Day Topics and Evidence Context
    if (input.snapshot.evidence.length > 0) {
      // Group evidence items by topicId
      const topicMap = new Map<string, { lane: string; items: AcceptedEvidenceItem[] }>();
      for (const item of input.snapshot.evidence) {
        const topicId = item.topicId || 'UNKNOWN_TOPIC';
        const existing = topicMap.get(topicId);
        if (existing) {
          existing.items.push(item);
        } else {
          topicMap.set(topicId, {
            lane: item.lane || 'UNKNOWN',
            items: [item],
          });
        }
      }

      const topicSections: string[] = [];
      for (const [topicId, group] of topicMap.entries()) {
        const itemsText = group.items
          .map(
            (it, idx) =>
              `    [#${idx + 1}] Time: ${it.originalTimestamp} | MsgID: ${it.telegramMessageId} | Text: "${it.verbatimText}"`,
          )
          .join('\n');

        topicSections.push(`- Topic ID: ${topicId} (Primary Lane: ${group.lane})
  Accepted Evidence:
${itemsText}`);
      }

      // Identify nearest earlier message
      const candidateTime = new Date(input.originalTimestamp).getTime();
      const earlierItems = input.snapshot.evidence.filter(
        (e) => new Date(e.originalTimestamp).getTime() <= candidateTime,
      );
      const nearestEarlier = earlierItems[earlierItems.length - 1];

      let nearestText = '';
      if (nearestEarlier) {
        nearestText = `\nNearest Earlier Same-Day Message in Mahalla: MsgID ${nearestEarlier.telegramMessageId} (Topic: ${nearestEarlier.topicId || 'N/A'}, Time: ${nearestEarlier.originalTimestamp}): "${nearestEarlier.verbatimText}"\n`;
      }

      sections.push(`### EXISTING SAME-DAY TOPICS & EVIDENCE (Mahalla: ${input.snapshot.mahallaName}, Day: ${input.snapshot.calendarDay})
${nearestText}
${topicSections.join('\n\n')}`);
    } else {
      sections.push(`### EXISTING SAME-DAY TOPICS & EVIDENCE (Mahalla: ${input.snapshot.mahallaName}, Day: ${input.snapshot.calendarDay})
(No active topics or accepted evidence recorded yet today in this Mahalla)`);
    }

    sections.push(
      `Evaluate the candidate message above and return the topic matching decision conforming to the schema.`,
    );

    return sections.join('\n\n');
  }

  public async evaluateTopicAssignment(
    input: EvaluateTopicAssignmentInput,
  ): Promise<AiGatewayResult<TopicMatchingResult>> {
    const userPrompt = this.buildUserPrompt(input);

    return this.aiGateway.generateStructured<TopicMatchingResult>({
      operationType: 'TOPIC_MATCHING',
      profileId: input.profileId,
      systemPrompt: TOPIC_MATCHING_SYSTEM_PROMPT,
      userPrompt,
      schema: TopicMatchingResultSchema,
      schemaName: 'topic_matching_result',
    });
  }
}
