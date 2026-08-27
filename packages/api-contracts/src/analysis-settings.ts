import { z } from 'zod';

export const AiModelProviderEnumSchema = z.enum([
  'OPENAI',
  'GEMINI',
  'GROQ',
  'OLLAMA',
]);
export type AiModelProvider = z.infer<typeof AiModelProviderEnumSchema>;

export const GlobalServiceVocabularyItemSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, 'Атама бўш бўлиши мумкин эмас.')
    .max(100, 'Атама 100 та белгидан ошмаслиги керак.'),
  category: z
    .string()
    .trim()
    .min(1, 'Тоифа бўш бўлиши мумкин эмас.')
    .max(100, 'Тоифа 100 та белгидан ошмаслиги керак.'),
  description: z
    .string()
    .trim()
    .max(500, 'Тавсиф 500 та белгидан ошмаслиги керак.')
    .optional(),
});
export type GlobalServiceVocabularyItem = z.infer<
  typeof GlobalServiceVocabularyItemSchema
>;

export const DEFAULT_GLOBAL_SERVICE_VOCABULARY: GlobalServiceVocabularyItem[] = [
  {
    term: 'Ичимлик суви',
    category: 'Сув таъминоти',
    description: 'Тоза ичимлик суви таъминоти, қувурлар ва босим',
  },
  {
    term: 'Оқова сув',
    category: 'Сув таъминоти',
    description: 'Канализация ва оқова сув тизимлари',
  },
  {
    term: 'Табиий газ',
    category: 'Газ таъминоти',
    description: 'Табиий газ тармоғи, босим ва таъминот',
  },
  {
    term: 'Суюлтирилган газ',
    category: 'Газ таъминоти',
    description: 'Маиший газ баллонлари таъминоти',
  },
  {
    term: 'Электр таъминоти',
    category: 'Электр энергияси',
    description: 'Трансформаторлар, симлар ва электр узилишлари',
  },
  {
    term: 'Кўча ёритгичлари',
    category: 'Электр энергияси',
    description: 'Тунги кўча чироқлари ва ёритиш тизими',
  },
  {
    term: 'Маиший чиқиндилар',
    category: 'Чиқинди ва тозалик',
    description: 'Чиқиндиларни олиб чиқиб кетиш ва тозалик',
  },
  {
    term: 'Ноқонуний чиқиндихона',
    category: 'Чиқинди ва тозалик',
    description: 'Ноқонуний ташланган чиқиндилар ва полигонлар',
  },
  {
    term: 'Ички йўллар',
    category: 'Йўл ва инфратузилма',
    description: 'Асфальт ётқизиш, чуқурлар ва йўл таъмири',
  },
  {
    term: 'Пиёдалар йўлаги',
    category: 'Йўл ва инфратузилма',
    description: 'Тротуарлар ва пиёдалар хавфсизлиги',
  },
  {
    term: 'Маҳалла фуқаролар йиғини',
    category: 'Ҳокимият ва бошқарув',
    description: 'МФЙ биноси, раис ва ходимлар фаолияти',
  },
  {
    term: 'Ободонлаштириш',
    category: 'Ҳокимият ва бошқарув',
    description: 'Ҳудудларни ободонлаштириш ва кўкаламзорлаштириш',
  },
];

export const GlobalAnalysisSettingsDtoSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  modelProvider: AiModelProviderEnumSchema,
  modelId: z.string().min(1),
  temperature: z.number().min(0.0).max(1.0),
  maxOutputTokens: z.number().int().min(100).max(2000),
  relevanceSystemPrompt: z.string().min(20).max(10000),
  topicMatchingSystemPrompt: z.string().min(20).max(10000),
  topicProjectionSystemPrompt: z.string().min(20).max(10000),
  globalServiceVocabulary: z.array(GlobalServiceVocabularyItemSchema),
  isActive: z.boolean(),
  activatedAt: z.string().datetime().nullable(),
  activatedBy: z.string().nullable().optional(),
  changeReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type GlobalAnalysisSettingsDto = z.infer<
  typeof GlobalAnalysisSettingsDtoSchema
>;

export const GlobalAnalysisSettingsDraftDtoSchema = z.object({
  id: z.literal('global'),
  baseActiveVersionId: z.string().nullable().optional(),
  modelProvider: AiModelProviderEnumSchema,
  modelId: z.string().min(1),
  temperature: z.number().min(0.0).max(1.0),
  maxOutputTokens: z.number().int().min(100).max(2000),
  relevanceSystemPrompt: z.string().min(20).max(10000),
  topicMatchingSystemPrompt: z.string().min(20).max(10000),
  topicProjectionSystemPrompt: z.string().min(20).max(10000),
  globalServiceVocabulary: z.array(GlobalServiceVocabularyItemSchema),
  updatedBy: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GlobalAnalysisSettingsDraftDto = z.infer<
  typeof GlobalAnalysisSettingsDraftDtoSchema
>;

export const SaveGlobalAnalysisSettingsDraftSchema = z.object({
  modelProvider: AiModelProviderEnumSchema,
  modelId: z
    .string()
    .trim()
    .min(1, 'Модель идентификатори киритилиши шарт.')
    .max(100, 'Модель идентификатори 100 та белгидан ошмаслиги керак.'),
  temperature: z
    .number({ invalid_type_error: 'Ҳарорат сони кўрсатилиши шарт.' })
    .min(0.0, 'Ҳарорат 0.0 дан кам бўлмаслиги керак.')
    .max(1.0, 'Ҳарорат 1.0 дан ошмаслиги керак.'),
  maxOutputTokens: z
    .number({ invalid_type_error: 'Максимал токенлар сони кўрсатилиши шарт.' })
    .int('Максимал токенлар бутун сон бўлиши керак.')
    .min(100, 'Максимал токенлар 100 дан кам бўлмаслиги керак.')
    .max(2000, 'Максимал токенлар 2000 дан ошмаслиги керак.'),
  relevanceSystemPrompt: z
    .string()
    .trim()
    .min(20, 'Долзарблик тизим кўрсатмаси камида 20 та белгидан иборат бўлиши керак.')
    .max(10000, 'Долзарблик тизим кўрсатмаси 10000 та белгидан ошмаслиги керак.'),
  topicMatchingSystemPrompt: z
    .string()
    .trim()
    .min(20, 'Мавзу бирлаштириш тизим кўрсатмаси камида 20 та белгидан иборат бўлиши керак.')
    .max(10000, 'Мавзу бирлаштириш тизим кўрсатмаси 10000 та белгидан ошмаслиги керак.'),
  topicProjectionSystemPrompt: z
    .string()
    .trim()
    .min(20, 'Мавзу проекцияси тизим кўрсатмаси камида 20 та белгидан иборат бўлиши керак.')
    .max(10000, 'Мавзу проекцияси тизим кўрсатмаси 10000 та белгидан ошмаслиги керак.'),
  globalServiceVocabulary: z
    .array(GlobalServiceVocabularyItemSchema)
    .min(1, 'Камида 1 та хизмат луғати атамаси киритилиши керак.')
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const normalized = item.term
          .trim()
          .normalize('NFC')
          .replace(/\s+/g, ' ')
          .toLowerCase();
        if (seen.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Луғат атамаси такрорланмаслиги керак: "${item.term}".`,
            path: [i, 'term'],
          });
        }
        seen.add(normalized);
      }
    }),
});
export type SaveGlobalAnalysisSettingsDraftRequest = z.infer<
  typeof SaveGlobalAnalysisSettingsDraftSchema
>;

export const GetGlobalAnalysisSettingsResponseSchema = z.object({
  activeConfiguration: GlobalAnalysisSettingsDtoSchema,
  draft: GlobalAnalysisSettingsDraftDtoSchema.nullable(),
});
export type GetGlobalAnalysisSettingsResponse = z.infer<
  typeof GetGlobalAnalysisSettingsResponseSchema
>;

export const SaveGlobalAnalysisSettingsDraftResponseSchema = z.object({
  draft: GlobalAnalysisSettingsDraftDtoSchema,
  message: z.string(),
});
export type SaveGlobalAnalysisSettingsDraftResponse = z.infer<
  typeof SaveGlobalAnalysisSettingsDraftResponseSchema
>;

// ==========================================
// District Analysis Settings Contracts (Story 5.2)
// ==========================================

export const DEFAULT_HOKIM_RECOGNITION_TERMS = [
  'Ҳоким',
  'Туман ҳокими',
  'Ҳоким ёрдамчиси',
  'Ҳокимият',
  'Сектор раҳбари',
  'Hokim',
  'Tuman hokimi',
  'Hokimiyat',
] as const;

export const DEFAULT_DISTRICT_VOCABULARY_CATEGORIES = [
  'Маҳалла номлари',
  'Мўлжал ва жойлар',
  'Маҳаллий атамалар',
  'Сув ҳавзалари ва каналлар',
  'Маҳаллий муассасалар',
  'Бошқа',
] as const;

export const DistrictLocalVocabularyItemSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, 'Атама бўш бўлиши мумкин эмас.')
    .max(100, 'Атама 100 та белгидан ошмаслиги керак.'),
  category: z
    .string()
    .trim()
    .min(1, 'Тоифа бўш бўлиши мумкин эмас.')
    .max(100, 'Тоифа 100 та белгидан ошмаслиги керак.'),
  description: z
    .string()
    .trim()
    .max(500, 'Тавсиф 500 та белгидан ошмаслиги керак.')
    .optional(),
});
export type DistrictLocalVocabularyItem = z.infer<
  typeof DistrictLocalVocabularyItemSchema
>;

export const DistrictAnalysisSettingsDtoSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  version: z.number().int().positive(),
  hokimRecognitionTerms: z.array(z.string()),
  localVocabularyAdditions: z.array(DistrictLocalVocabularyItemSchema),
  isActive: z.boolean(),
  activatedAt: z.string().datetime().nullable(),
  activatedBy: z.string().nullable().optional(),
  changeReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type DistrictAnalysisSettingsDto = z.infer<
  typeof DistrictAnalysisSettingsDtoSchema
>;

export const DistrictAnalysisSettingsDraftDtoSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  baseActiveVersionId: z.string().nullable().optional(),
  hokimRecognitionTerms: z.array(z.string()),
  localVocabularyAdditions: z.array(DistrictLocalVocabularyItemSchema),
  updatedBy: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DistrictAnalysisSettingsDraftDto = z.infer<
  typeof DistrictAnalysisSettingsDraftDtoSchema
>;

export const SaveDistrictAnalysisSettingsDraftSchema = z.object({
  hokimRecognitionTerms: z
    .array(
      z
        .string()
        .trim()
        .min(2, 'Ҳоким атамаси камида 2 та белгидан иборат бўлиши керак.')
        .max(100, 'Ҳоким атамаси 100 та белгидан ошмаслиги керак.'),
    )
    .min(1, 'Камида 1 та ҳокимга оид атама киритилиши шарт.')
    .max(50, 'Ҳокимга оид атамалар сони 50 тадан ошмаслиги керак.')
    .superRefine((terms, ctx) => {
      const seen = new Set<string>();
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        if (!term) continue;
        const normalized = term
          .trim()
          .normalize('NFC')
          .replace(/\s+/g, ' ')
          .toLowerCase();
        if (seen.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Ҳоким атамаси такрорланмаслиги керак: "${term}".`,
            path: [i],
          });
        }
        seen.add(normalized);
      }
    }),
  localVocabularyAdditions: z
    .array(DistrictLocalVocabularyItemSchema)
    .max(100, 'Маҳаллий луғат атамалари сони 100 тадан ошмаслиги керак.')
    .default([])
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const normalized = item.term
          .trim()
          .normalize('NFC')
          .replace(/\s+/g, ' ')
          .toLowerCase();
        if (seen.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Маҳаллий луғат атамаси такрорланмаслиги керак: "${item.term}".`,
            path: [i, 'term'],
          });
        }
        seen.add(normalized);
      }
    }),
});
export type SaveDistrictAnalysisSettingsDraftRequest = z.infer<
  typeof SaveDistrictAnalysisSettingsDraftSchema
>;

export const GetDistrictAnalysisSettingsResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  activeConfiguration: DistrictAnalysisSettingsDtoSchema,
  draft: DistrictAnalysisSettingsDraftDtoSchema.nullable(),
});
export type GetDistrictAnalysisSettingsResponse = z.infer<
  typeof GetDistrictAnalysisSettingsResponseSchema
>;

export const SaveDistrictAnalysisSettingsDraftResponseSchema = z.object({
  draft: DistrictAnalysisSettingsDraftDtoSchema,
  message: z.string(),
});
export type SaveDistrictAnalysisSettingsDraftResponse = z.infer<
  typeof SaveDistrictAnalysisSettingsDraftResponseSchema
>;

// ==========================================
// Story 5.3: Activation Contracts & Secret Scanning
// ==========================================

export const PROHIBITED_SECRET_PATTERNS = [
  // 1. Telegram Bot Token: 8 to 12 digits, colon, and 34 to 36 base64url characters
  /\b\d{8,12}:[A-Za-z0-9_-]{34,36}\b/,
  // 2. OpenAI API Keys (Legacy sk-, Project sk-proj-, Admin sk-admin-, Org sk-org-)
  /\bsk-(?:proj-|admin-|org-)?[A-Za-z0-9_-]{20,}\b/,
  // 3. Google AI Studio / Gemini API Keys (Legacy AIza... and Modern AQ....)
  /\b(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{20,})\b/,
  // 4. Groq Cloud API Key
  /\bgsk_[A-Za-z0-9_-]{40,64}\b/,
  // 5. Anthropic Claude API Key (sk-ant-api..., sk-ant-admin..., sk-ant-oat...)
  /\bsk-ant-(?:api\d{2}|admin\d{2}|oat\d{2})-[A-Za-z0-9_-]{40,}\b/,
  // 6. JSON Web Tokens (JWT: 3 base64url parts starting with eyJ)
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  // 7. Authorization Bearer Token header string
  /\bBearer\s+[A-Za-z0-9\-._~+/]{20,}=*\b/i,
  // 8. Explicit key assignment patterns (e.g. api_key = "...", secret = '...')
  /(?:api[_-]?key|secret[_-]?key|bot[_-]?token|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"]?[A-Za-z0-9_\-.~+=]{16,}['"]?/i,
];

export function containsProhibitedSecrets(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return PROHIBITED_SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

export const ChangeReasonSchema = z
  .string({ invalid_type_error: 'Ўзгартириш сабаби матн бўлиши шарт.' })
  .trim()
  .min(5, 'Ўзгартириш сабаби камида 5 та белгидан иборат бўлиши шарт.')
  .max(500, 'Ўзгартириш сабаби 500 та белгидан ошмаслиги керак.')
  .superRefine((val, ctx) => {
    if (containsProhibitedSecrets(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Ўзгартириш сабабида махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });

export const ActivateGlobalAnalysisSettingsRequestSchema = z.object({
  baseActiveVersionId: z
    .string({ invalid_type_error: 'Базавий фаол версия идентификатори талаб қилинади.' })
    .min(1, 'Базавий фаол версия идентификатори талаб қилинади.'),
  changeReason: ChangeReasonSchema,
});
export type ActivateGlobalAnalysisSettingsRequest = z.infer<
  typeof ActivateGlobalAnalysisSettingsRequestSchema
>;

export const ActivateGlobalAnalysisSettingsResponseSchema = z.object({
  activeConfiguration: GlobalAnalysisSettingsDtoSchema,
  previousVersionId: z.string(),
  message: z.string(),
});
export type ActivateGlobalAnalysisSettingsResponse = z.infer<
  typeof ActivateGlobalAnalysisSettingsResponseSchema
>;

export const ActivateDistrictAnalysisSettingsRequestSchema = z.object({
  baseActiveVersionId: z
    .string({ invalid_type_error: 'Базавий фаол версия идентификатори талаб қилинади.' })
    .min(1, 'Базавий фаол версия идентификатори талаб қилинади.'),
  changeReason: ChangeReasonSchema,
});
export type ActivateDistrictAnalysisSettingsRequest = z.infer<
  typeof ActivateDistrictAnalysisSettingsRequestSchema
>;

export const ActivateDistrictAnalysisSettingsResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  activeConfiguration: DistrictAnalysisSettingsDtoSchema,
  previousVersionId: z.string(),
  message: z.string(),
});
export type ActivateDistrictAnalysisSettingsResponse = z.infer<
  typeof ActivateDistrictAnalysisSettingsResponseSchema
>;


