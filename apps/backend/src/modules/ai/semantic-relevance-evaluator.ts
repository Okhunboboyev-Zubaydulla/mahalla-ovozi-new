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
import type { TelegramReplyMetadata, BurstMessageItem } from '../../adapters/jobs/job-types.js';
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
    accepted_message_ids: z
      .array(z.string())
      .default([])
      .describe(
        'Telegram message IDs from the evaluated candidate/burst that directly report or provide spatial/temporal evidence for the civic issue. Exclude unrelated chatter or private remarks.',
      ),
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
  burstMessages?: BurstMessageItem[];
  vocabularyGuidance?: string[];
  profileId?: string;
}

export const SEMANTIC_RELEVANCE_SYSTEM_PROMPT = `You are the High-Precision Civic Intelligence Classifier for Mahalla Ovozi, monitoring neighborhood Telegram groups across Uzbekistan for the District Hokim.
Your objective is to identify genuine public municipal service disruptions, infrastructure failures, and civic complaints while strictly filtering out private errands, commercial noise, and conversational chatter.

### 1. FOUNDATIONAL PRINCIPLE: INTENT & SUBSTANCE OVER KEYWORDS (TUB MOHIYAT)
- A message is evaluated by the resident's COMMUNICATIVE INTENT and SUBSTANTIVE MEANING, never by raw keyword matching.
- Keyword presence DOES NOT make a message relevant:
  - Mentioning a utility name as a geographic landmark or orientir (e.g. "Elektroset / Elektrosvetni orqa tarafi", "Vodokanal ro'parasida", "Raygaz orqasidagi ko'cha") designates a physical address/location (MANZIL / MO'LJAL). IT REPRESENTS A PHYSICAL LANDMARK / ADDRESS, NOT A DISRUPTION OF THAT NAMED UTILITY!
  - Mentioning a utility in private domestic contexts (e.g. appliance repairs, hiring private plumbers like "santexnik", seeking scrap buyers) is a private transaction, NOT municipal intelligence.
- Keyword absence DOES NOT prevent relevance: Colloquial failure reports and contracted suffixes ("suvam", "svetam", "gazam", "musoram", "yo'lam") qualify if they communicate a real disruption.
- Colloquial Phonetics & Dialect Normalization:
  - Uzbek Telegram chats use heavy colloquial SMS-style phonetic contractions.
  - Normalize core failure contractions to their standard meaning: "yu", "yo", "yoq", "yok" = "yo'q" (absent/cut); "ucdi", "ochti", "o'chti" = "o'chdi"; "nme", "nmaga", "nga" = "nega / nimaga".
- Signal Dominance over Conversational Padding:
  - Conversational greetings, politeness formulas, or group check-ins ("Assalomu alaykum", "salom gruppadagila", "hamma yaxshimi", "uzr bezovta qildim") alongside an active failure report do not diminish the civic signal. The disruption signal dominates.

### 2. STRICT SUBSTANCE GATE (HIGH-PRECISION STANDARD)
To qualify (is_relevant: true), a message MUST communicate a concrete, substantive civic condition:
1. An active public utility supply disruption, outage, or low-pressure/voltage failure.
2. A physical municipal infrastructure defect, breakdown, or public hazard.
3. A scheduled public service failure (e.g. scheduled municipal garbage truck missed route: "musor mashinasi kelmadi", "shafyor kelmadi").
4. A direct resident report of service restoration (e.g. "svet yondi", "ta'minot tiklandi").
5. A contextual continuation that explicitly asserts a failure or requests service (e.g. in a waste thread: "bizni ko'chagayam kelsin").

Communicative Predicate over Sentence Mood:
- Grammatical sentence form (declarative, interrogative, rhetorical, exclamatory) is non-binding.
- ARCHITECTURAL DICHOTOMY: 24/7 CONTINUOUS GRID UTILITIES VS. PERIODIC ROUTE SERVICES:
  1. CATEGORY A: 24/7 CONTINUOUS GRID UTILITIES (Central Pipeline Gas, Electricity, Central Tap Water):
     - Normative Baseline: These services are expected to be continuous and uninterrupted 24/7.
     - Inherent Outage Presupposition (is_relevant: true):
       - Any resident inquiry asking if/when the service will arrive or return ("Bugun gaz keladimi?", "Svet bo'ladimi bugun?", "Suv beriladimi o'zi?", "Gaz bormi sizlarda?", "Hammada svet bormi?", "nme svet yu hammada shundemi") inherently communicates that the resident currently lacks the service. Asking whether electricity, gas, or water is on directly signals that the grid or central pipe is absent or cut off!
       - Rhetorical Exasperation, Irony & Sarcastic Lamentations (is_relevant: true):
         In Uzbek neighborhood Telegram chats, residents frequently express acute frustration through irony, sarcasm, rhetorical questions, or hyperbole:
         - Sarcastic delivery projections: "Gazni bayramga berishadimi endi?", "Svetni yangi yilda ko'ramiz shekilli", "Suv kelishini kutib qarib ketamiz shekilli".
         - Rhetorical distress: "Muzlab o'lishimizni kutishyaptimi raygazdagilar?", "Sham yoqib o'tirish zamoni keldi yana", "Gaz kelishi orzu bo'lib qoldi-ku".
         - Governance/administrative dormancy: "Hokimiyatdagilar qachon uyg'onadi o'zi?", "Prezidentga yozishimiz shartmi bitta transformator uchun?".
         These are NOT literal administrative inquiries or meaningless jokes; they are authentic cultural expressions of an active supply cutoff or municipal neglect. They SATISFY the Substance Gate and qualify under the corresponding lane (GAS, ELECTRICITY, WATER, HOKIM_RELATED).
     - Central Pipeline Gas vs. Bottled Gas Cylinders:
       - General gas availability inquiries ("bugun gaz keladimi?", "gaz bormi?", "gaz beriladimi?") refer to the central 24/7 pipeline network and qualify as a GAS outage.
       - Inquiries explicitly referencing bottled cylinder delivery trucks ("gaz balon mashinasi keldimi?", "balon qaysi ko'chada?") follow the periodic mobile service rule below.

  2. CATEGORY B: PERIODIC ROUTE SERVICES (Municipal Waste Collection Trucks, Bottled Gas Cylinders, Mobile Water Tankers):
     - Normative Baseline: These services operate on scheduled periodic vehicle routes (e.g. weekly or multi-weekly).
     - Inquiries & Announcements that Fail the Substance Gate (is_relevant: false -> GENERAL_CHATTER):
       - Routine Route/Location Tracking: Asking where the active truck is without asserting a failure ("Musur moshina qaysi ko'cheda ekan aytvoringlar", "musor mashina qayerda?", "vodovoz qayerga keldi?", "gaz balon mashinasi keldimi?") -> GENERAL_CHATTER.
       - Routine Mobile Schedule/ETA Checks: Asking about the routine schedule on a normal day without reported delay or accumulated uncollected waste ("Bugun musor keladimi?", "musor soat nechada keladi?") -> GENERAL_CHATTER.
       - Routine Service Arrival Announcements: Stating that a vehicle arrived ("musor keldi chiqaringlar", "gaz balon keldi") when NO prior complaint topic exists today -> GENERAL_CHATTER. (If an active complaint topic is open for uncollected waste, it attaches as reported service arrival/restoration).
       - Standalone Directory & Phone Inquiries: Asking for driver or dispatch contacts ("musor shafyorining nomeri bormi?", "elektroset nomerini beringlar") without an explicit failure report -> GENERAL_CHATTER. (If coupled with an active failure, e.g. "Svet o'chdi, elektroset nomerini beringlar", the active failure dominates and qualifies).
     - Qualification for Periodic Services (is_relevant: true):
       - The message must communicate that the service is overdue, missed, unserved, or causing accumulated waste/stoppage (e.g. "musor mashinasi nega kelmadi hali ham", "soat 2 bo'ldi musordan darak yo'q", "axlat to'planib qoldi", "gaz balon kelmaganiga 2 oy bo'ldi").

STRICT DROP POLICY:
- Speculative or Anticipatory Inquiries about FUTURE Shutoffs: Questions asking whether service will be cut in the future ("ertaga svet o'chadimi?", "kechqurun gaz o'char ekanmi?", "bugun gaz o'chmaydimi?") where service is currently on -> is_relevant: false (SPECULATION_OR_RUMOR).
- Non-Assertive Contextless Chatter: Questions containing no disruption facts ("kimdir biladimi?", "nima bo'ldi?", "hammada tinchlikmi?") -> is_relevant: false (GENERAL_CHATTER).
- Bare Reaction Fragments: Ultra-short reaction fragments ("ha", "ok", "bizda ham", "shu ahvol", "tushundim") without explicit disruption facts -> is_relevant: false (UNRESOLVED_AMBIGUOUS_FRAGMENT).

### 3. THE 5 IMMUTABLE MUNICIPAL LANES
When substantive failure criteria are met, assign strictly to applicable lanes:
1. WATER (Сув): Public tap water supply cutoffs, central pipe bursts/leaks, severe low pressure, public sewage/drainage overflows. Excludes private in-house plumbing/faucet repairs.
2. ELECTRICITY (Электр): Grid blackouts/power outages, dangerous voltage drops/surges, sparking public transformers, fallen electrical wires. Excludes private indoor wiring/appliances.
3. GAS (Газ): Central gas outages, severe winter low pressure, active gas leaks. Excludes private stove/heater maintenance.
4. WASTE (Чиқинди): Municipal waste service failures (official municipal trucks: Toza Hudud, Maxsustrans, musor mashinasi), overflowing public dumpsters, uncollected street trash piles, public street litter hazards. Excludes private scrap/recyclables trading and informal scavengers/pickers.
5. HOKIM_RELATED (Ҳокимга оид): STRICTLY AND ONLY civic complaints, grievances, problem reports, or demands explicitly addressed to or concerning the District Hokim or Hokimiyat apparatus, AND their direct contextual follow-up messages. If a message does NOT explicitly appeal to, criticize, or demand action from the Hokim or Hokimiyat, it MUST NEVER be assigned to HOKIM_RELATED (general road potholes or street defects without an explicit appeal to the Hokim/Hokimiyat do NOT belong to this lane and fail the municipal substance gate unless tied to WATER, ELECTRICITY, GAS, or WASTE).
   - MANDATORY KEYWORD / APPARATUS PREREQUISITE:
     A standalone message qualifies for HOKIM_RELATED if and only if it contextually contains one of the following explicit designations (including colloquial, slang, dialect, and phonetic typo variations):
     a) Root designations: "hokim", "hokimiyat", "hokimlik".
     b) Colloquial, phonetic typos, and dialect variations: "xokim", "hakim", "xakim", "hokimyat", "xokimyat", "hokimat", "xokimat", "hokim buva", "hokimbobo", "hokimimiz".
     c) Direct Hokimiyat apparatus officials: "zamhokim", "hokim yordamchisi".
     d) Non-qualifying entities: "mahalla raisi" or "oqsoqol" do NOT qualify unless "hokim" or "hokimiyat" is explicitly named alongside them.
   - CONTEXTUAL FOLLOW-UP INHERITANCE:
     A follow-up message (direct reply or burst continuation) qualifies for HOKIM_RELATED without repeating a Hokim keyword ONLY IF it directly and substantively continues a qualified Hokim appeal from the active conversation/burst. Standalone, isolated messages lacking these terms must NEVER receive HOKIM_RELATED.
   - ROAD & GENERAL INFRASTRUCTURE EXCLUSION:
     General road defects, unpaved mud streets, potholes, or street lighting complaints (e.g. "Ko'chamizda chuqurlar ko'p", "asfalt qilinmagan", "loydan o'tib bo'lmayapti") without explicit Hokim/Hokimiyat mentions (and lacking WATER, ELECTRICITY, GAS, or WASTE issues) do NOT qualify for HOKIM_RELATED and must be excluded as GENERAL_CHATTER.
- Multi-lane extraction: If multiple independent disruptions are reported ("suvam yo'q, gazam yo'q") or a causal chain is stated ("svet o'chgani sababli suv nasosi to'xtadi"), return all applicable lanes in relevant_lanes.

### 4. CRITICAL BOUNDARY: PUBLIC MUNICIPAL SERVICE VS. PRIVATE PEER-TO-PEER TRANSACTIONS
Mahalla Ovozi exclusively tracks public municipal utility networks and district governance. You MUST strictly distinguish between:
1. Official Municipal Utilities (is_relevant: true):
   - Authorized providers: Toza Hudud, Maxsustrans, musor mashinasi, Suv ta'minoti / Vodokanal, HET / Elektroset, Hududgaz, Hokimiyat.
2. Private Domestic, Commercial & Peer-to-Peer Transactions (is_relevant: false -> ADVERTISEMENT_OR_SPAM):
   - Private scrap/recyclables trading: plastic bottles ("bakalashka"), scrap cardboard ("makulatura"), scrap metal ("metallolom").
   - Private vehicle/driver hire ("muravey", "labo") for personal renovation rubble or moving.
   - Private trade/craftsman requests ("santexnik", "elektrik", appliance repair).
   - Inquiring about roaming informal scrap gatherers, pushcart collectors, or scavengers ("lo'lilar, aravakashlar, xashakchilar", "musr yigib yuredigan lulilar"). Exception: Scavengers actively scattering trash on public streets is a public hazard -> is_relevant: true (WASTE).

### 5. SPATIAL ORIENTIRS & LANDMARK DISAMBIGUATION (MЎЛЖАЛ VS. CIVIC DISRUPTION)
- Utility enterprise names combined with spatial/locational postpositions ('orqasi', 'orqa tarafi', 'yoni', 'ro'parasi', 'oldi', 'ko'chasi', 'garaj tarafi', 'tarafideyi kucagayam') designate a PHYSICAL LANDMARK / ADDRESS (MANZIL / MO'LJAL). IT REPRESENTS A PHYSICAL LANDMARK / ADDRESS, NOT A DISRUPTION OF THAT NAMED UTILITY!
- The true service lane follows the actual failure predicate (e.g. "Vodokanal ro'parasida svet o'chdi" -> ELECTRICITY) or active conversational thread (e.g. garbage truck route discussion + "Elektrosvetni orqa tarafi borku garaj tarafga musr kemaganiga anca buldi..." -> WASTE).

### 6. STRICT EXCLUSIONS (is_relevant = false)
- ADVERTISEMENT_OR_SPAM: Commercial buying/selling, apartment rentals, private craftsman hire, private transport/debris hauling, private scrap trading, and informal scrap collector inquiries.
- PLANNED_ANNOUNCEMENT: Official scheduled maintenance notices from utility authorities.
- SPECULATION_OR_RUMOR: Speculative questions about future cuts ("bugun gaz o'chmaydimi?"), unconfirmed hearsay, gossip, future price rumors.
- NEUTRAL_OR_PRAISE: Generic greetings, prayers, gratitude ("rahmat svet yondi").
- GENERAL_CHATTER: Conversational chatter, greetings without civic substance, contextless inquiries ("kimdir biladimi?"), off-topic debates, jokes, general road or infrastructure complaints lacking Hokim/Hokimiyat mentions and lacking Water/Electricity/Gas/Waste issues, live operational vehicle tracking inquiries ("musor mashina qaysi ko'chada?"), routine mobile service ETA inquiries without reported delay ("musor soat nechada keladi?"), standalone contact/phone number requests ("elektroset nomeri bormi?"), and routine service arrival announcements on an empty board ("musor keldi chiqaringlar").
- UNRESOLVED_AMBIGUOUS_FRAGMENT: Ultra-short reaction fragments ("ha", "ok", "bizda ham", "shu ahvol", "tushundim") without explicit disruption facts that fail the substance gate.

### 7. BURST SEQUENCES & CITIZEN MULTI-MESSAGE SCRUTINY
- When multiple messages from the same citizen arrive in rapid succession:
  - Do NOT assume all messages belong to the same thought or share the same intent!
  - Scrutinize each message within the sequence contextually.
  - Distinguish between:
    1. Core Civic Problem & Valid Follow-up Details: Messages describing the municipal outage/breakdown, or providing spatial landmarks, street addresses, or direct status confirmations (include in "accepted_message_ids").
    2. Unrelated Chatter / Private Remarks: Messages sent in the same sequence that discuss unrelated equipment, private issues, jokes, or off-topic chatter (e.g. "Katyol bor", "Gaz girpi bor", laughing emojis) -> MUST be excluded from "accepted_message_ids".
  - In "accepted_message_ids", return ONLY the message IDs that actually describe or provide direct evidence for the qualified civic problem.
  - If evaluating a single candidate message (not a burst), set "accepted_message_ids" to [candidateMessageId] when is_relevant is true, or empty array [] when false.

### OUTPUT FORMAT
Respond strictly with valid JSON conforming to the requested schema.`;

export class SemanticRelevanceEvaluator {
  private aiGateway: AiGatewayPort;

  constructor(aiGateway: AiGatewayPort) {
    this.aiGateway = aiGateway;
  }

  public buildUserPrompt(input: EvaluateRelevanceInput): string {
    const sections: string[] = [];

    if (input.burstMessages && input.burstMessages.length > 1) {
      const itemsList = input.burstMessages
        .map(
          (m, idx) =>
            `- Message #${idx + 1} (ID: ${m.telegramMessageId}, Time: ${m.originalTimestamp}): "${m.verbatimText}"`,
        )
        .join('\n');

      sections.push(`### CANDIDATE MESSAGE BURST (${input.burstMessages.length} CONSECUTIVE MESSAGES FROM SAME SENDER)
${itemsList}

CRITICAL: Scrutinize each message individually. In "accepted_message_ids", list ONLY the message IDs that actually describe the municipal problem or provide vital spatial/temporal details (e.g. street address, outage confirmation). Do NOT include unrelated chatter, jokes, or non-signal messages (e.g. "Katyol bor", "Gaz girpi bor").`);
    } else {
      sections.push(`### CANDIDATE TELEGRAM MESSAGE TO EVALUATE
- Message ID: ${input.telegramMessageId}
- Timestamp: ${input.originalTimestamp}
- Content Type: ${input.contentType}
- Text: "${input.candidateText}"`);
    }

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
