import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import {
  QualifyingLaneSchema,
  type QualifyingLane,
} from '@mahalla-ovozi/api-contracts';
import type { DbClient } from '../../adapters/db/client.js';
import { acceptedEvidence } from '../../adapters/db/schema/accepted-evidence.js';
import type { AiGatewayPort } from '../ai/ai-gateway.js';
import {
  type MahallaDailySnapshot,
  groupSnapshotByTopic,
  formatEvidenceItemLine,
} from '../ai/context-snapshot.js';
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

export const TopicMatchingResultSchema = z.preprocess(
  (val: any) => {
    if (!val || typeof val !== 'object') return val;
    const copy = { ...val };
    if (typeof copy.reasoning === 'string' && copy.reasoning.length > 300) {
      copy.reasoning = copy.reasoning.slice(0, 300);
    }
    return copy;
  },
  z
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
    ),
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

### 1. FOUNDATIONAL INVARIANT: HIGH-LEVEL COMMUNAL TOPICS VS. ACUTE PHYSICAL HAZARDS
- A Topic represents a single, continuous, real-world incident, supply outage, or civic situation in this Mahalla on this calendar day.
- COMMUNAL UTILITY & SERVICE DISRUPTIONS ARE MAHALLA-WIDE (LOCATION-AGNOSTIC):
  - In a Mahalla, public utility networks and municipal services (Gas supply/pressure, Electricity grid/voltage, Tap water supply/pressure, Municipal garbage truck routes) are communal infrastructure.
  - When an outage or disruption occurs, residents across different streets (e.g. Street A, Street B) or without any street name are reporting the SAME overarching communal disruption.
  - Street names, landmarks, or lack of address in supply outage reports are SPATIAL DETAILS / EVIDENCE, NOT indicators of separate incidents!
  - You MUST NOT create separate topics simply because residents name different streets when reporting the same general utility disruption.
- Contextual intent (tub mohiyat) takes precedence over raw keyword matching.
- All evidence and topics are strictly bounded to the same District, Mahalla, and calendar day (Asia/Tashkent).

### 2. DECISION TAXONOMY & STRICT CONTRACTS
1. MATCH_EXISTING_TOPIC:
   - The candidate reports service loss, outages, pressure/voltage fluctuations, updates, inquiries, restoration reports, recurrences, or confirmations concerning the active communal outage or existing incident in this Mahalla in the same service lane.
   - Format: "decision": "MATCH_EXISTING_TOPIC", "matched_topic_id": "<existing_topic_id>", "primary_lane": null.
2. NEW_TOPIC:
   - The candidate seeds the first topic for this service lane in the Mahalla today; OR
   - The candidate reports an acute, distinct physical infrastructure hazard with an incompatible failure predicate (e.g. an active pipe rupture flooding a street vs dry tap water shutoff; a sparking/exploding transformer or fallen wire vs quiet grid blackout).
   - Format: "decision": "NEW_TOPIC", "matched_topic_id": null, "primary_lane": "<LANE>".
   - STRICT UPSTREAM LANE CONSTRAINT: primary_lane MUST strictly be chosen from the candidate's upstream Relevant Lanes provided in the prompt. You MUST NEVER select a primary_lane that is not present in the candidate's Relevant Lanes!
3. UNASSIGNABLE_VAGUE:
   - The candidate is an isolated, subjectless conversational fragment without a clear link to any active topic; OR
   - The candidate is an operational vehicle tracking inquiry ("musor mashina qaysi ko'chada?"), routine schedule/ETA check without failure, or standalone contact lookup without an active disruption report. Such messages MUST NOT seed new topics nor attach to existing topics; OR
   - The candidate discusses private domestic errands, handyman/craftsman hire ("santexnik kerak"), scrap recycling ("bakalashka oladigan nomeri"), or private transport/debris hauling ("remont chiqindisiga muravey bormi"). Such messages MUST NOT be merged into active municipal topics nor seed new topics.
   - Format: "decision": "UNASSIGNABLE_VAGUE", "matched_topic_id": null, "primary_lane": null.

### 3. SPATIAL ORIENTIRS & LANDMARK DISAMBIGUATION (CRITICAL EXCEPTION (SPATIAL ORIENTIRS / ADDRESSES))
- Utility enterprise names (e.g. "Elektroset/Elektrosvet/REO", "Vodokanal/Suvokova", "Raygaz/Gorkaz") combined with spatial/locational markers ('orqasi', 'orqa tarafi', 'yoni', 'ro'parasi', 'oldi', 'ko'chasi', 'garaj tarafi', 'tarafideyi kucagayam') designate a PHYSICAL LANDMARK / ADDRESS (MANZIL / MO'LJAL). They do NOT represent a service disruption of that utility!
- For example, "elektrosvet orqa tarafideyi kucagayam kesin" in a waste context requests the municipal garbage truck to service the street behind the electric utility office. This belongs strictly to WASTE (per upstream Relevant Lanes), NEVER ELECTRICITY!

### 4. DOMAIN BOUNDARIES & HOKIM_RELATED CAUSAL CONSOLIDATION
- Incident Semantic Relevance Precedence (Municipal Disruption vs. Private Peer Requests): An active Topic represents a PUBLIC MUNICIPAL / COMMUNAL issue or disruption. Private peer-to-peer requests must never be attached to public topics (designate UNASSIGNABLE_VAGUE).
- HOKIM_RELATED is strictly reserved for civic complaints, grievances, or problem reports explicitly addressed to or demanding action from the District Hokim or Hokimiyat (tuman/shahar hokimi, hokimlik, hokim yordamchisi), and their direct thread follow-ups.
- Causal Domain Aggregation for HOKIM_RELATED:
  - Hokim complaints in the same Mahalla on the same day that address the SAME underlying grievance domain merge into a single high-level topic regardless of different street names:
    - All road defects, mud, potholes, and unpaved street complaints addressed to the Hokim merge into one high-level Hokim road topic.
    - Utility-inaction escalations to the Hokim merge into the Hokim escalation topic for that domain.
    - General governance and administration complaints merge into one general governance topic.
- Messages that do NOT address or criticize the Hokim/Hokimiyat MUST NEVER be assigned to or matched into HOKIM_RELATED.
- You MUST NEVER match a message across different service lanes (e.g. water outage cannot merge into electricity topic).

### 5. CLUSTERING RULES & MULTI-INCIDENT DISAMBIGUATION
1. Same-Day Community-Wide Outage Consolidation (Location-Agnostic):
   - For public utilities (GAS, ELECTRICITY, WATER, WASTE), all reports of supply cuts, outages, pressure drops, voltage instability, or missed municipal collection in the same lane MUST merge into the active general lane topic (MATCH_EXISTING_TOPIC).
   - This applies REGARDLESS of whether different residents name Street A, Street B, or no address at all.
   - Same-day inquiries ("suv keldimi?", "bugun gaz keladimi?", "chiroq yondimi?", "svet bo'ladimi?"), sarcastic/rhetorical reports ("gazni bayramga berishadimi?"), recurrences ("yana o'chdi"), or restoration reports belong to this ongoing general topic, even after several hours of silence.
2. Acute Physical Point Hazards vs. General Supply Outages:
   - A distinct acute physical hazard (e.g. central pipe rupture flooding a street, overflowing sewage manhole, sparking/exploding transformer, downed power lines) represents an immediate emergency hazard with an incompatible failure predicate from general quiet supply outages.
   - Such acute physical hazards seed a separate NEW_TOPIC if one does not already exist for that localized emergency.
   - General outage inquiries continue to merge into the communal supply outage topic, while direct follow-ups about the acute hazard attach to the hazard topic.
3. Chat Silence & Multi-Incident Disambiguation for Localized Follow-ups:
   - Within 30 minutes of chat activity: Match to the topic of the immediate preceding recent message (N-1 in chat).
   - After >30 minutes of chat silence: When multiple localized physical incident topics exist in the same lane and a follow-up does not name a street or landmark, The AI MUST NOT guess between the two localized streets -> classify as UNASSIGNABLE_VAGUE.

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
      const topicMap = groupSnapshotByTopic(input.snapshot);

      const topicSections: string[] = [];
      for (const [topicId, group] of topicMap.entries()) {
        const itemsText = group.items
          .map((it, idx) =>
            formatEvidenceItemLine(it, idx, {
              indent: '    ',
              timeLabel: 'Time',
            }),
          )
          .join('\n');

        const cleanSummary = group.summary?.trim().replace(/\n/g, ' ');
        const initialExcerpt = group.items[0]?.verbatimText
          ? `(Initial report: "${group.items[0].verbatimText.slice(0, 100).replace(/\n/g, ' ')}")`
          : '';
        const summaryDisplay = cleanSummary ? `"${cleanSummary}"` : initialExcerpt;
        const summaryLine = summaryDisplay ? `\n  Current Topic Summary: ${summaryDisplay}` : '';

        topicSections.push(`- Topic ID: ${topicId} (Primary Lane: ${group.lane})${summaryLine}
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
        const prevTime = new Date(nearestEarlier.originalTimestamp).getTime();
        const diffMinutes = !Number.isNaN(prevTime) && !Number.isNaN(candidateTime)
          ? Math.round((candidateTime - prevTime) / 60000)
          : null;
        const diffText = diffMinutes !== null ? ` (+${diffMinutes}m before candidate)` : '';
        nearestText = `\nNearest Earlier Same-Day Message in Mahalla: MsgID ${nearestEarlier.telegramMessageId}${diffText} (Topic: ${nearestEarlier.topicId || 'N/A'}, Time: ${nearestEarlier.originalTimestamp}): "${nearestEarlier.verbatimText}"\n`;
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
