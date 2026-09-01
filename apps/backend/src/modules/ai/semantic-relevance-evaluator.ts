import { z } from 'zod';
import {
  QualifyingLaneSchema,
  type QualifyingLane,
} from '@mahalla-ovozi/api-contracts';
import type { AiGatewayPort } from './ai-gateway.js';
import {
  type MahallaDailySnapshot,
  formatSnapshotForSemanticRelevance,
} from './context-snapshot.js';
import type { TelegramReplyMetadata } from '../../adapters/jobs/boss-client.js';
import type { AiGatewayResult } from './types.js';

export const QualifyingLaneEnum = QualifyingLaneSchema;
export type { QualifyingLane };

export const ExclusionReasonEnum = z.enum([
  'PLANNED_ANNOUNCEMENT',
  'ADVERTISEMENT_OR_SPAM',
  'SPECULATION_OR_RUMOR',
  'NEUTRAL_OR_PRAISE',
  'GENERAL_CHATTER',
  'UNRESOLVED_AMBIGUOUS_FRAGMENT',
]);
export type ExclusionReason = z.infer<typeof ExclusionReasonEnum>;

export const SemanticRelevanceResultSchema = z
  .object({
    is_relevant: z.boolean().describe('Whether the message reports a genuine, active citizen issue or Hokim concern'),
    relevant_lanes: z.array(QualifyingLaneEnum).describe('Municipal service or leadership lanes applicable to the issue'),
    exclusion_reason: ExclusionReasonEnum.nullable().describe('Specific exclusion reason if is_relevant is false, otherwise null'),
    reasoning: z.string().max(300).describe('Brief 1-sentence explanation of the decision'),
  })
  .refine(
    (data) => {
      if (data.is_relevant) {
        return data.relevant_lanes.length >= 1 && data.exclusion_reason === null;
      } else {
        return data.relevant_lanes.length === 0 && data.exclusion_reason !== null;
      }
    },
    {
      message:
        'Inconsistent semantic relevance output: is_relevant=true requires at least one lane and null exclusion_reason; is_relevant=false requires empty lanes and non-null exclusion_reason',
    },
  );

export type SemanticRelevanceResult = z.infer<typeof SemanticRelevanceResultSchema>;

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

### CORE REASONING PRINCIPLE: PRAGMATIC RESIDENT INTENT & UNDERLYING REALITY (TUB MOHIYAT)
- Evaluate the UNDERLYING CIVIC REALITY and COMMUNICATIVE INTENT of the resident, NOT literal grammar or formal syntax.
- Real neighborhood group messages in Uzbekistan are conversational, colloquial, and implicit.
- When a resident posts:
  1. Service Inquiries / Status Questions: "svet keldimi?", "chiroq bormi?", "suv keldimi?", "nasos ishlayaptimi?", "gaz bormi sizlarda?", "chiroq yondimi?", "svet qachon keladi?"
  2. Outage Consequences & Living Conditions: "qorong'uda o'tiribmiz", "muzxona erib ketdi", "chiroqsiz qoldik", "suvsiz qoldik", "bolalar sovuqda o'tiribdi", "ko'cha qorong'u"
  3. Outage & Disruption Statements: "suv yuq", "suv yo'q", "suv o'chdi", "svet o'chdi", "chiroq yo'q", "tok yo'q", "gaz o'chdi", "давление паст", "tok 160V"
  4. Local Infrastructure / Hazard Alerts: "truba yorildi", "kanalizatsiya toshdi", "yo'l cho'kib ketgan", "musor to'lib ketgan", "sim uzilib tushdi"
- ALL of the above communicative acts signify that a resident is experiencing or observing an active municipal disruption, outage, or hazard.
- They MUST ALWAYS be classified as relevant (is_relevant: true) under the corresponding lane (WATER, ELECTRICITY, GAS, WASTE, HOKIM_RELATED), even if phrased as a question, exclamation, or colloquial inquiry.

### LANGUAGE & SCRIPT SUPPORT
Messages may be in Uzbek (Latin or Cyrillic), Russian, or mixed colloquial forms (e.g., "suv yuq", "svet o'chdi", "давление паст", "мусор тўлиб кетган", "ток 160V"). Evaluate meaning regardless of spelling, script, or slang.

### QUALIFYING LANES
1. WATER (Сув): Tap water outages (suv yo'q, suv o'chdi, suv yuq, suv kelmayapti, suv keldimi?), low pressure, pipe bursts (truba yorildi), sewage leaks/overflows (kanalizatsiya), polluted drinking water.
2. ELECTRICITY (Электр): Power cuts (svet o'chdi/chiroq yo'q/tok yo'q, svet keldimi?, chiroq yondimi?), low/high voltage (tok past, 160V), sparking transformers, dangerous fallen wires.
3. GAS (Газ): Gas outages (gaz yo'q, gaz o'chdi, gaz bormi?), low gas pressure in winter (davlenie past), leaks, odor of gas.
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
- GENERAL_CHATTER: Off-topic discussions, jokes, arguments, political debates, vague blaming ("mas'ullar qayerga qarayapti").
- UNRESOLVED_AMBIGUOUS_FRAGMENT: Applies ONLY to ultra-short, empty conversational fragments that contain NO reference or implication of any utility or civic issue (e.g., literally just "ha", "yo'q", "rahmat", "ok", "tushunarli", "qayerda?"). If a utility or civic issue is mentioned or implied (e.g. "svet keldimi?", "suv bormi?"), it is NOT an ambiguous fragment — it is RELEVANT.

### CONTEXT & TEMPORAL THREAD CONTINUITY RULES
- You are provided with SAME-DAY ACCEPTED EVIDENCE from the same Mahalla (ordered chronologically).
- CONVERSATIONAL THREAD CONTINUITY (IMMEDIATE PRECEDING CONTEXT):
  - When a message is a context-dependent continuation, reaction, confirmation, or opinion without explicitly repeating the service name (e.g., "manimcha berishmasa kere", "ha nimayam qilardik ertaga keb qolar", "bizda ham shu ahvol", "yana o'chdimi?"):
  - You MUST evaluate it in the context of the IMMEDIATE PRECEDING MESSAGE (the nearest recent active discussion in the chat from 1-5 minutes ago).
  - If the nearest preceding message discussed WATER ("suvni berisharmikan bugun", "manimcha berishmasa kere"), the continuation belongs to WATER! Do NOT jump back to older, earlier topics from 15-30 minutes ago.
- If no relevant same-day context exists at all to resolve a fragment (e.g., standalone "ha", "ok", "rahmat"), classify as is_relevant: false (UNRESOLVED_AMBIGUOUS_FRAGMENT).
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
- Reply To Message ID: ${input.replyMetadata.replyToMessageId}`);
      }
    }

    sections.push(formatSnapshotForSemanticRelevance(input.snapshot));

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
