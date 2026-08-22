import type { AiGatewayPort } from '../ai/ai-gateway.js';
import {
  TopicProjectionResultSchema,
  isUzbekCyrillic,
  type TopicProjectionResult,
  type TopicProjectionInput,
  type TopicProjectionEvaluation,
} from '../ai/topic-projection-contracts.js';
import { AiGatewayError } from '../ai/types.js';
import type { AcceptedEvidenceItem } from '../ai/context-snapshot.js';

export const TOPIC_PROJECTION_SYSTEM_PROMPT = `You are the Canonical Topic Projection Engine for Mahalla Ovozi, a municipal intelligence platform monitoring neighborhood Telegram groups across Uzbekistan.
Your objective is to recalculate the single, authoritative, multi-lane derived representation for a target Topic based on its Accepted Evidence and same-day Mahalla context.

### CORE PRINCIPLES & GUARDRAILS
1. CAUTIOUS UZBEK CYRILLIC SUMMARY:
   - Provide a concise 1-3 sentence summary strictly in authentic Uzbek Cyrillic.
   - Use cautious neutral framing (e.g. "Маҳалла аҳолиси хабарига кўра, ...", "Фуқаролар ... хабар қилишмоқда").
   - Citizen reports are reported claims, NOT verified ground truth.
   - Preserve reported contradictions, disagreements, voltage fluctuations, recurrences ("яна ўчди"), and reported restoration ("чироқ ёнди").
   - A reported restoration must be described as reported (e.g. "Аҳоли чироқ ёнганини хабар қилди"), NEVER asserting official resolution or closing the issue.
   - Do NOT invent Hokim recommendations, sentiment, urgency scores, or required actions.

2. MULTI-LANE DERIVATION:
   - Identify all applicable municipal/governance lanes from: WATER, ELECTRICITY, GAS, WASTE, HOKIM_RELATED.
   - The target Topic's initial primaryLane is IMMUTABLE and MUST be included in the lanes array.
   - Include HOKIM_RELATED if the evidence involves local governance, Hokimiyat promises, road infrastructure, or administrative neglect.
   - "is_hokim_related" MUST be true if and only if HOKIM_RELATED is present in "lanes".

3. ANCHOR SELECTION:
   - Select the latest self-contained, descriptive, and meaningful evidence item belonging strictly to the target Topic as "anchor_evidence_id".
   - A vague follow-up (e.g. "Бизда ҳам", "Қачон бўлади?") or brief restoration notice must NOT replace a detailed self-contained report as anchor.
   - Extract the key quotation or excerpt into "anchor_quote".
   - "anchor_evidence_id" MUST strictly match an evidence ID from the target Topic.

4. LATEST MEANINGFUL ACTIVITY TIMESTAMP:
   - "latest_meaningful_activity_timestamp" MUST strictly match the exact ISO-8601 originalTimestamp of an Accepted Evidence item belonging to the target Topic.
   - Do NOT invent or use system/current time.

5. ATTRIBUTION & PRIVACY:
   - Use cautious neutral attribution or permitted resident Telegram handle/display name.
   - NEVER include, infer, or reconstruct phone numbers.

### OUTPUT FORMAT
Respond strictly with valid JSON conforming to the requested schema.`;

export class TopicProjectionEvaluator {
  private aiGateway: AiGatewayPort;

  constructor(aiGateway: AiGatewayPort) {
    this.aiGateway = aiGateway;
  }

  public buildUserPrompt(input: TopicProjectionInput): string {
    const sections: string[] = [];

    // 1. Target Topic Demarcation
    sections.push(`### TARGET TOPIC TO RECALCULATE
- Topic ID: ${input.topicId}
- Primary Lane (Immutable): ${input.primaryLane}
- Generation: ${input.generation}
- Mahalla: ${input.snapshot.mahallaName}
- Calendar Day: ${input.snapshot.calendarDay}`);

    // Group snapshot evidence by topicId
    const targetEvidence: AcceptedEvidenceItem[] = [];
    const otherTopicsMap = new Map<string, { lane: string; items: AcceptedEvidenceItem[] }>();

    for (const item of input.snapshot.evidence) {
      if (item.topicId === input.topicId) {
        targetEvidence.push(item);
      } else {
        const otherId = item.topicId || `OTHER_${item.id}`;
        const existing = otherTopicsMap.get(otherId);
        if (existing) {
          existing.items.push(item);
        } else {
          otherTopicsMap.set(otherId, {
            lane: item.lane || 'UNKNOWN',
            items: [item],
          });
        }
      }
    }

    // 2. Target Topic Evidence Items
    if (targetEvidence.length > 0) {
      const targetItemsText = targetEvidence
        .map(
          (it, idx) =>
            `  [Evidence #${idx + 1}] ID: ${it.id} | Time: ${it.originalTimestamp} | MsgID: ${it.telegramMessageId} | Text: "${it.verbatimText}"`,
        )
        .join('\n');

      sections.push(`### ACCEPTED EVIDENCE FOR TARGET TOPIC (${input.topicId})
${targetItemsText}`);
    } else {
      sections.push(`### ACCEPTED EVIDENCE FOR TARGET TOPIC (${input.topicId})
(No accepted evidence found for target topic)`);
    }

    // 3. Other Same-Day Topics in Mahalla (Context)
    if (otherTopicsMap.size > 0) {
      const otherSections: string[] = [];
      for (const [otherId, group] of otherTopicsMap.entries()) {
        const itemsText = group.items
          .map(
            (it, idx) =>
              `    [#${idx + 1}] ID: ${it.id} | Time: ${it.originalTimestamp} | MsgID: ${it.telegramMessageId} | Text: "${it.verbatimText}"`,
          )
          .join('\n');

        otherSections.push(`- Other Topic ID: ${otherId} (Lane: ${group.lane})
  Evidence:
${itemsText}`);
      }

      sections.push(`### OTHER SAME-DAY TOPICS IN MAHALLA (Context Only)
${otherSections.join('\n\n')}`);
    }

    sections.push(
      `Recalculate the canonical multi-lane projection for target Topic ${input.topicId} and return the structured JSON output.`,
    );

    return sections.join('\n\n');
  }

  public async evaluateTopicProjection(
    input: TopicProjectionInput,
  ): Promise<TopicProjectionEvaluation> {
    const targetEvidence = input.snapshot.evidence.filter(
      (e) => e.topicId === input.topicId,
    );

    if (targetEvidence.length === 0) {
      throw new AiGatewayError(
        'INVALID_OUTPUT_SEMANTICS',
        `Cannot calculate topic projection: target topic ${input.topicId} has no accepted evidence in snapshot`,
      );
    }

    const userPrompt = this.buildUserPrompt(input);

    const aiResult = await this.aiGateway.generateStructured<TopicProjectionResult>({
      operationType: 'TOPIC_DERIVED_PROJECTION',
      profileId: input.profileId,
      systemPrompt: TOPIC_PROJECTION_SYSTEM_PROMPT,
      userPrompt,
      schema: TopicProjectionResultSchema,
      schemaName: 'topic_projection_result',
    });

    const data = aiResult.data;

    // Post-generation semantic guardrails (AC 6, 7, 8, 9, 11)

    // Guardrail 1: anchor_evidence_id must belong strictly to target Topic evidence
    const validEvidenceIds = new Set(targetEvidence.map((e) => e.id));
    if (!validEvidenceIds.has(data.anchor_evidence_id)) {
      throw new AiGatewayError(
        'INVALID_OUTPUT_SEMANTICS',
        `anchor_evidence_id "${data.anchor_evidence_id}" does not belong to target topic ${input.topicId}`,
      );
    }

    // Guardrail 2: latest_meaningful_activity_timestamp must match originalTimestamp of an evidence item in target Topic
    const validTimestamps = new Set(
      targetEvidence.map((e) => {
        const d = new Date(e.originalTimestamp);
        return isNaN(d.getTime()) ? '' : d.toISOString();
      }),
    );
    const parsedDate = new Date(data.latest_meaningful_activity_timestamp);
    if (isNaN(parsedDate.getTime())) {
      throw new AiGatewayError(
        'INVALID_OUTPUT_SEMANTICS',
        `latest_meaningful_activity_timestamp "${data.latest_meaningful_activity_timestamp}" is not a valid ISO-8601 date string`,
      );
    }
    const resultTimestampIso = parsedDate.toISOString();

    if (!validTimestamps.has(resultTimestampIso)) {
      throw new AiGatewayError(
        'INVALID_OUTPUT_SEMANTICS',
        `latest_meaningful_activity_timestamp "${data.latest_meaningful_activity_timestamp}" does not match any evidence timestamp in target topic ${input.topicId}`,
      );
    }

    // Guardrail 3: lanes must include target Topic's immutable primaryLane
    if (!data.lanes.includes(input.primaryLane)) {
      throw new AiGatewayError(
        'INVALID_OUTPUT_SEMANTICS',
        `Derived lanes [${data.lanes.join(', ')}] must include target topic's immutable primary lane "${input.primaryLane}"`,
      );
    }

    // Guardrail 4: summary must contain authentic Uzbek Cyrillic text
    if (!isUzbekCyrillic(data.summary)) {
      throw new AiGatewayError(
        'INVALID_OUTPUT_SEMANTICS',
        `Summary must contain authentic Uzbek Cyrillic characters (length: ${data.summary.length})`,
      );
    }

    // Guardrail 5: programmatic phone number check (AD-11, AC 9)
    const phoneRegex = /(?:\+?998|\b)[0-9]{9,}\b/;
    if (
      phoneRegex.test(data.summary) ||
      phoneRegex.test(data.anchor_quote) ||
      (data.attribution && phoneRegex.test(data.attribution))
    ) {
      throw new AiGatewayError(
        'INVALID_OUTPUT_SEMANTICS',
        'Output contains forbidden phone number pattern violating privacy invariants',
      );
    }

    return {
      summary: data.summary,
      lanes: data.lanes,
      primaryLane: input.primaryLane,
      anchorEvidenceId: data.anchor_evidence_id,
      anchorQuote: data.anchor_quote,
      latestMeaningfulActivityTimestamp: resultTimestampIso,
      attribution: data.attribution,
      isHokimRelated: data.is_hokim_related,
      generation: input.generation,
      aiResult,
    };
  }
}
