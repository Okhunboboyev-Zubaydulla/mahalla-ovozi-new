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
