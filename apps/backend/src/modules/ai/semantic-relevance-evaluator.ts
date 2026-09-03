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
  1. Service Inquiries / Status Questions: "svet keldimi?", "chiroq bormi?", "suv keldimi?", "nasos ishlayaptimi?", "gaz bormi sizlarda?", "chiroq yondimi?", "svet qachon keladi?", "musor mashinasi keladimi?"
  2. Outage Consequences & Living Conditions: "qorong'uda o'tiribmiz", "muzxona erib ketdi", "chiroqsiz qoldik", "suvsiz qoldik", "bolalar sovuqda o'tiribdi", "ko'cha qorong'u"
  3. Outage & Disruption Statements: "suv yuq", "suv yo'q", "suv o'chdi", "svet o'chdi", "chiroq yo'q", "tok yo'q", "gaz o'chdi", "давление паст", "tok 160V"
  4. Local Infrastructure / Hazard Alerts: "truba yorildi", "kanalizatsiya toshdi", "yo'l cho'kib ketgan", "musor to'lib ketgan", "sim uzilib tushdi"
- ALL of the above communicative acts signify that a resident is experiencing or observing an active municipal disruption, outage, or hazard.
- They MUST ALWAYS be classified as relevant (is_relevant: true) under the corresponding lane (WATER, ELECTRICITY, GAS, WASTE, HOKIM_RELATED), even if phrased as a question, exclamation, or colloquial inquiry.

### CRITICAL BOUNDARY: PUBLIC MUNICIPAL SERVICE VS. PRIVATE PEER-TO-PEER TRANSACTIONS
Mahalla Ovozi exclusively tracks disruptions, outages, and hazards under the domain of Municipal / Communal Public Utilities and District Leadership (Hokimiyat, Toza Hudud, Maxsustrans, Suv Ta'minoti, HET, Hududgaz).
You MUST strictly distinguish between:
1. PUBLIC MUNICIPAL SERVICE DISRUPTIONS & CIVIC ISSUES (is_relevant: true):
   - Failures, delays, or outages of public utility networks and scheduled public municipal services.
   - Public neighborhood infrastructure hazards (ruptured water mains, sparking public transformers, broken street asphalt, open manholes, blocked irrigation canals).
   - Official municipal waste collection failures: scheduled municipal garbage truck did not arrive ("musor mashinasi kelmadi", "shafyor kelmadi", "pulini to'layapmiz shafyor kelmayapti", "bizni ko'chaga ham kelsin"), overflowing public neighborhood dumpsters/containers, uncollected street trash, illegal dumping on public roads/grounds.
   - Public service status inquiries and follow-ups ("chiroq yondimi?", "suv keldimi?", "musor mashinasi bugun keladimi?").
2. PRIVATE DOMESTIC, COMMERCIAL & PEER-TO-PEER TRANSACTIONS (is_relevant: false -> ADVERTISEMENT_OR_SPAM):
   - Inquiries about or offers from private scrap/recyclables buyers/collectors: plastic bottles ("bakalashka oladiganlar nomeri", "bakalashka oladigan bormi"), scrap paper/cardboard ("makulatura"), scrap metal ("metallolom", "temir-tersak"), used car batteries ("akkumulyator"). These are private recyclables/scrap transactions, NOT municipal waste collection.
   - Seeking or offering private vehicle/driver hire ("muravey", "labo", "gazel", "damas") for private chores, hauling private renovation/construction debris ("remontdan keyingi chiqindi", "qurilish chiqindisi"), garden trimming, or household moving. In Uzbekistan, municipal waste services legally do not haul construction rubble; hiring a private driver/muravey is a private domestic errand.
   - Seeking or offering private trade/craftsman services: private plumbers ("santexnik bormi/nomeri", in-house leaky faucets/toilets), private electricians ("rozetka/lyustra ustasi"), appliance technicians ("gaz plita ustasi", "kotyol ustasi", "konditsioner ustasi").
   - Distinction note: If construction debris is reported as dumped illegally on a public street, road, or canal, it is an illegal dump -> is_relevant: true (WASTE or HOKIM_RELATED). But asking neighbors to hire a vehicle/muravey to haul one's own renovation trash is a private transaction -> is_relevant: false (ADVERTISEMENT_OR_SPAM).

### LANGUAGE & SCRIPT SUPPORT
Messages may be in Uzbek (Latin or Cyrillic), Russian, or mixed colloquial forms (e.g., "suv yuq", "svet o'chdi", "давление паст", "мусор тўлиб кетган", "ток 160V", "suvam o'chdi").
CRITICAL: Recognize Uzbek colloquial contracted suffixes ('-am', '-yam', '-ham' meaning "also/too") and fused particles:
- Water: "suvam" (= suv ham), "suvom", "nasosam", "trubayam", "kanalizatsiyam", "suvimizam"
- Electricity: "svetam" (= svet ham), "tokam", "chiroqam", "fazayam", "transformatoram"
- Gas: "gazam" (= gaz ham), "bosimam", "issiqligam", "otopleniyayam"
- Waste: "musoram" (= musor ham), "axlatam", "chiqindiyam"
- Hokim / Infrastructure: "yo'lam", "chuquram", "asfaltam", "ariqam", "lyukam"

### QUALIFYING LANES
1. WATER (Сув): Tap water outages (suv yo'q, suv o'chdi, suv yuq, suvam o'chdi, suv kelmayapti, suv keldimi?), low pressure, pipe bursts (truba yorildi), sewage leaks/overflows (kanalizatsiya), polluted drinking water. EXCLUDES private in-house plumbing/faucet repairs.
2. ELECTRICITY (Электр): Power cuts (svet o'chdi/chiroq yo'q/tok yo'q/svetam o'chdi, svet keldimi?, chiroq yondimi?), low/high voltage (tok past, 160V), sparking transformers, dangerous fallen wires. EXCLUDES private indoor appliance or socket repairs.
3. GAS (Газ): Gas outages (gaz yo'q, gaz o'chdi, gazam o'chdi, gaz bormi?), low gas pressure in winter (davlenie past), leaks, odor of gas. EXCLUDES private stove or boiler handyman requests.
4. WASTE (Чиқинди): Municipal waste service failures (scheduled collection truck missed / did not arrive: "musor mashinasi kelmadi", "shafyor kelmadi", "bizni ko'chaga kelsin"), overflowing public neighborhood dumpsters/containers ("musorxona to'lgan", "musoram olinmadi"), uncollected street trash, illegal public dumps, animal carcasses on public roads. EXCLUDES private scrap trading (bakalashka, makulatura) and private vehicle hire for renovation debris (muravey, labo).
5. HOKIM_RELATED (Ҳокимга оид): 
   - Direct appeals/complaints to the District Hokim, Hokimiyat, or sector leadership.
   - Non-service public infrastructure issues: broken roads/potholes (yo'llar rasvo, asfalt, chuqur, yo'lam rasvo), broken streetlights, blocked irrigation canals (ariqlar), illegal construction.
   - Overlap: If a resident complains about water and explicitly asks the Hokim to intervene, select both WATER and HOKIM_RELATED.

### COMPOUND & CAUSAL MESSAGES (MULTI-LANE EXTRACTION)
- Compound / Co-occurring Outages: If a message mentions multiple independent utility outages (e.g. "suvam yo'q, gazam yo'q", "svet ham suv ham o'chdi"), return ALL applicable lanes in relevant_lanes (e.g. ['WATER', 'GAS'] or ['ELECTRICITY', 'WATER']).
- Causal Chains: If a message indicates a disruption caused another service failure (e.g. "svet o'chgani sababli suv nasosi to'xtadi", "gaz yo'qligiga svetda isitgich yoqdik"), include both the root cause and the impacted lane in relevant_lanes (e.g. ['ELECTRICITY', 'WATER']).

### STRICT EXCLUSIONS (is_relevant = false)
- PLANNED_ANNOUNCEMENT: Official maintenance notices (e.g., "Ertaga soat 09:00 dan 18:00 gacha ta'mirlash sababli elektr o'chiriladi").
- ADVERTISEMENT_OR_SPAM: Commercial buying/selling, apartment rentals, course ads, private service inquiries, private craftsman/handyman requests (santexnik, elektrik, gaz plita ustasi), private transportation/hauling hire (muravey, labo, gazel for renovation rubble or moving), private scrap/recyclable trading (bakalashka, makulatura, scrap metal).
- SPECULATION_OR_RUMOR: Unconfirmed hearsay, future pricing rumors.
- NEUTRAL_OR_PRAISE: "Rahmat svet yondi", "Hokim keldi", general greetings, prayers.
- GENERAL_CHATTER: Off-topic discussions, jokes, arguments, political debates, vague blaming ("mas'ullar qayerga qarayapti").
- UNRESOLVED_AMBIGUOUS_FRAGMENT: Applies ONLY to ultra-short, empty conversational fragments that contain NO reference or implication of any utility or civic issue (e.g., literally just "ha", "yo'q", "rahmat", "ok", "tushunarli", "qayerda?"). If a utility or civic issue is mentioned or implied (e.g. "svet keldimi?", "suv bormi?", "suvam o'chdi"), it is NOT an ambiguous fragment — it is RELEVANT.

### CONTEXT & TEMPORAL THREAD CONTINUITY RULES
- You are provided with SAME-DAY ACCEPTED EVIDENCE from the same Mahalla (ordered chronologically) and the explicit IMMEDIATE PRECEDING MESSAGE (N-1 IN CHAT).
- DOMAIN SPECIFICITY OVERRIDES CONTINUITY:
  - When a message explicitly mentions a distinct utility category or its contracted form (e.g. "Suvam ucdi mana", "Gazam o'chdi"), the explicit service lane (e.g. WATER) MUST take precedence. NEVER inherit or overwrite the lane with an earlier different utility topic (e.g. ELECTRICITY).
- STRICT N-1 CONTINUITY FOR SUBJECTLESS FOLLOW-UPS:
  - When a candidate message is a continuation, reaction, confirmation, or complaint without an explicit utility keyword (e.g. "Cherez den uciroriw odat bub qoldi ln. Remon diyiladi...", "manimcha berishmasa kere", "ha nimayam qilardik ertaga keb qolar", "bizda ham shu ahvol", "haliyam kelmadi", "yana o'chdimi?"):
  - You MUST evaluate it strictly in the context of the IMMEDIATE PRECEDING MESSAGE (N-1 IN CHAT).
  - If the Immediate Preceding Message (N-1) is ELECTRICITY (e.g. "kamiga svetam yu"), the candidate's relevant_lanes MUST be ['ELECTRICITY']!
  - You MUST NOT skip the immediate preceding message (N-1) to latch onto older conversation starters (N-2, N-3, such as an earlier gas inquiry) unless the candidate explicitly names that other service.
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

    // Extract Immediate Preceding Message (N-1 in Chat)
    if (input.snapshot.evidence.length > 0) {
      const candidateTime = new Date(input.originalTimestamp).getTime();
      const earlierItems = input.snapshot.evidence.filter(
        (e) => new Date(e.originalTimestamp).getTime() <= candidateTime,
      );
      const nearestEarlier = earlierItems[earlierItems.length - 1];

      if (nearestEarlier) {
        const prevTime = new Date(nearestEarlier.originalTimestamp).getTime();
        const diffMinutes =
          !Number.isNaN(prevTime) && !Number.isNaN(candidateTime)
            ? Math.round((candidateTime - prevTime) / 60000)
            : null;
        const diffText = diffMinutes !== null ? ` (+${diffMinutes}m before candidate)` : '';
        const laneText = nearestEarlier.lane ? ` (Lane: [${nearestEarlier.lane}])` : '';
        sections.push(`### IMMEDIATE PRECEDING MESSAGE (N-1 IN CHAT)
- Message ID: ${nearestEarlier.telegramMessageId}${diffText}${laneText}
- Timestamp: ${nearestEarlier.originalTimestamp}
- Text: "${nearestEarlier.verbatimText}"`);
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
