import type { AiGatewayPort } from './ai-gateway.js';
import {
  SemanticRelevanceResultSchema,
  type SemanticRelevanceResult,
} from './semantic-relevance-contracts.js';
import type { MahallaDailySnapshot } from './context-snapshot.js';
import type { TelegramReplyMetadata } from '../../adapters/jobs/boss-client.js';
import type { AiGatewayResult } from './types.js';

export interface EvaluateRelevanceInput {
  candidateText: string;
  telegramMessageId: string;
  originalTimestamp: string;
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  replyMetadata: TelegramReplyMetadata | null;
  snapshot: MahallaDailySnapshot;
  vocabularyGuidance?: string[];
  profileId?: string;
}

export const SEMANTIC_RELEVANCE_SYSTEM_PROMPT = `You are the Semantic Relevance Engine for Mahalla Ovozi, an AI platform monitoring neighborhood Telegram groups in Uzbekistan.
Analyze candidate messages and determine whether they represent genuine, active civic problems, service disruptions, or District Leadership (Hokim) concerns.

### LANGUAGE & SCRIPT SUPPORT
Messages may be in Uzbek (Latin or Cyrillic), Russian, or mixed colloquial forms (e.g., "svet o'chdi", "давление паст", "мусор тўлиб кетган"). Evaluate meaning regardless of spelling, script, or slang.

### QUALIFYING LANES
1. WATER (Сув): Tap water outages, low pressure, pipe bursts, sewage leaks/overflows (kanalizatsiya), polluted drinking water.
2. ELECTRICITY (Электр): Power cuts (svet o'chdi/chiroq yo'q), low/high voltage (tok past, 160V), sparking transformers, dangerous fallen wires.
3. GAS (Газ): Gas outages, low gas pressure in winter, leaks, odor of gas.
4. WASTE (Чиқинди): Overflowing garbage containers (musorxona to'lgan), uncollected trash, illegal dumps, animal carcasses.
5. HOKIM_RELATED (Ҳокимга оид): 
   - Direct appeals/complaints to the District Hokim, Hokimiyat, or sector leadership.
   - Non-service public infrastructure issues: broken roads/potholes (yo'llar rasvo, asfalt, chuqur), broken streetlights, blocked irrigation canals (ariqlar), illegal construction.
   - Overlap: If a resident complains about water and explicitly asks the Hokim to intervene, select both WATER and HOKIM_RELATED.

### STRICT EXCLUSIONS (is_relevant = false)
- PLANNED_ANNOUNCEMENT: Official maintenance notices (e.g., "Ertaga soat 09:00 dan 18:00 gacha ta'mirlash sababli elektr o'chiriladi").
- ADVERTISEMENT_OR_SPAM: Buying, selling, apartment rentals, plumbing/electrician services, course ads.
- SPECULATION_OR_RUMOR: Unconfirmed hearsay, future pricing rumors.
- NEUTRAL_OR_PRAISE: "Rahmat svet yondi", "Hokim keldi", general greetings, prayers.
- GENERAL_CHATTER: Off-topic discussions, jokes, arguments, vague blaming ("mas'ullar qayerga qarayapti").
- UNRESOLVED_AMBIGUOUS_FRAGMENT: Short fragments (e.g., "Bizda ham", "Nega?") that cannot be linked to any same-day Mahalla context.

### CONTEXT & AMBIGUITY RULES
- You are provided with SAME-DAY ACCEPTED EVIDENCE from the same Mahalla (if any exists).
- If the candidate message is a short fragment (e.g., "Bizdayam o'chdi", "Bizda ham shu ahvol"):
  - Check same-day evidence: if evidence shows an active electricity outage today, classify as relevant under ELECTRICITY.
  - If no relevant same-day context exists, classify as is_relevant = false (UNRESOLVED_AMBIGUOUS_FRAGMENT).
- If the candidate is a reply to an excluded forwarded parent, the parent is NOT provided. The candidate MUST stand on its own meaning. If it cannot stand on its own, exclude it.

### VOCABULARY GUIDANCE RULE
Configured recognition keywords are guidance-only:
- Keyword presence DOES NOT force relevance (e.g., an ad selling "gaz plita" is still an ADVERTISEMENT).
- Keyword absence DOES NOT prevent relevance (e.g., "Truba yorilib suv ko'chaga oqyapti" is WATER even if "suv ta'minoti" keyword is absent).

### OUTPUT FORMAT
Respond strictly with valid JSON conforming to the requested schema.`;

export class SemanticRelevanceEvaluator {
  private aiGateway: AiGatewayPort;

  constructor(aiGateway: AiGatewayPort) {
    this.aiGateway = aiGateway;
  }

  public buildUserPrompt(input: EvaluateRelevanceInput): string {
    const sections: string[] = [];

    sections.push(`### CANDIDATE TELEGRAM MESSAGE TO EVALUATE
- Message ID: ${input.telegramMessageId}
- Timestamp: ${input.originalTimestamp}
- Content Type: ${input.contentType}
- Text: "${input.candidateText}"`);

    if (input.replyMetadata) {
      if (input.replyMetadata.replyToIsForwarded) {
        sections.push(`### REPLY CONTEXT
- Note: This message is a reply to a Telegram-forwarded parent message.
- Isolation Rule: The parent message is excluded and not provided. The candidate message MUST contain a self-contained civic signal to qualify. If its meaning depends on the missing forwarded parent, exclude it as UNRESOLVED_AMBIGUOUS_FRAGMENT.`);
      } else {
        sections.push(`### REPLY CONTEXT
- Reply To Message ID: ${input.replyMetadata.replyToMessageId}
- Reply To User ID: ${input.replyMetadata.replyToUserId || 'unknown'}`);
      }
    }

    if (input.snapshot.evidence.length > 0) {
      const evidenceList = input.snapshot.evidence
        .map(
          (e, idx) =>
            `[#${idx + 1}] Timestamp: ${e.originalTimestamp} | MsgID: ${e.telegramMessageId}${e.lane ? ` | Lane: [${e.lane}]` : ''} | Text: "${e.verbatimText}"`,
        )
        .join('\n');

      sections.push(`### SAME-DAY ACCEPTED EVIDENCE CONTEXT (Mahalla: ${input.snapshot.mahallaName}, Day: ${input.snapshot.calendarDay})
${evidenceList}`);
    } else {
      sections.push(`### SAME-DAY ACCEPTED EVIDENCE CONTEXT (Mahalla: ${input.snapshot.mahallaName}, Day: ${input.snapshot.calendarDay})
(No accepted evidence recorded yet today for this Mahalla)`);
    }

    if (input.vocabularyGuidance && input.vocabularyGuidance.length > 0) {
      sections.push(`### CONFIGURED DISTRICT RECOGNITION VOCABULARY (GUIDANCE ONLY)
[${input.vocabularyGuidance.join(', ')}]`);
    }

    sections.push(`Analyze the candidate message above and return the semantic relevance decision.`);
    return sections.join('\n\n');
  }

  public async evaluateRelevance(
    input: EvaluateRelevanceInput,
  ): Promise<AiGatewayResult<SemanticRelevanceResult>> {
    const userPrompt = this.buildUserPrompt(input);

    return this.aiGateway.generateStructured<SemanticRelevanceResult>({
      operationType: 'SEMANTIC_RELEVANCE',
      profileId: input.profileId,
      systemPrompt: SEMANTIC_RELEVANCE_SYSTEM_PROMPT,
      userPrompt,
      schema: SemanticRelevanceResultSchema,
      schemaName: 'semantic_relevance_result',
    });
  }
}
