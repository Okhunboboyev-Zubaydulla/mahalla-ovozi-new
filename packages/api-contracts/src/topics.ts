import { z } from 'zod';

export const QualifyingLaneSchema = z.enum([
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
  'HOKIM_RELATED',
]);
export type QualifyingLane = z.infer<typeof QualifyingLaneSchema>;

export const TopicPrimaryLaneSchema = QualifyingLaneSchema;
export type TopicPrimaryLane = QualifyingLane;

export const TelegramReplyMetadataSchema = z.object({
  replyToMessageId: z.string().min(1),
  replyToUserId: z.string().optional(),
  replyToIsForwarded: z.boolean(),
  replyToIsBot: z.boolean(),
});
export type TelegramReplyMetadata = z.infer<typeof TelegramReplyMetadataSchema>;

export const SearchMatchBadgeSchema = z.enum(['evidence', 'author']);
export type SearchMatchBadge = z.infer<typeof SearchMatchBadgeSchema>;

export const TopicCardItemSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  mahallaName: z.string(),
  calendarDay: z.string(),
  summary: z.string(),
  primaryLane: QualifyingLaneSchema,
  lanes: z.array(QualifyingLaneSchema),
  additionalLanes: z.array(QualifyingLaneSchema),
  evidenceCount: z.number().int().min(0),
  latestMeaningfulActivityTimestamp: z.string().datetime(),
  isNew: z.boolean(),
  isUpdated: z.boolean(),
  searchMatchBadge: SearchMatchBadgeSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TopicCardItem = z.infer<typeof TopicCardItemSchema>;

export const HokimLaneBoardDataSchema = z.object({
  lane: QualifyingLaneSchema,
  topics: z.array(TopicCardItemSchema),
  totalCount: z.number().int().min(0),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});
export type HokimLaneBoardData = z.infer<typeof HokimLaneBoardDataSchema>;

export const DateFilterScopeSchema = z.enum(['today', 'yesterday', 'custom']);
export type DateFilterScope = z.infer<typeof DateFilterScopeSchema>;

export const LanesQueryParamSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  let items: string[] = [];
  if (typeof val === 'string') {
    items = val.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(val)) {
    items = val
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : item))
      .map((s) => (typeof s === 'string' ? s.trim() : s))
      .filter(Boolean);
  } else {
    return val;
  }
  const unique = Array.from(new Set(items));
  return unique.length > 0 ? unique : undefined;
}, z.array(QualifyingLaneSchema).min(1, 'Камида 1 та йўналиш танланиши керак').max(5, 'Кўпи билан 5 та йўналиш танланиши мумкин').optional());
export type LanesQueryParam = z.infer<typeof LanesQueryParamSchema>;

export const HokimTopicBoardQuerySchema = z
  .object({
    dateScope: DateFilterScopeSchema.default('today'),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    mahallaName: z.string().trim().min(1).optional(),
    lanes: LanesQueryParamSchema,
    calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    baselineTimestamp: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateScope === 'custom') {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси (dateFrom) киритилиши шарт.',
          path: ['dateFrom'],
        });
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Тугаш санаси (dateTo) киритилиши шарт.',
          path: ['dateTo'],
        });
      }
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.',
          path: ['dateFrom'],
        });
      }
    }
  });
export type HokimTopicBoardQuery = z.input<typeof HokimTopicBoardQuerySchema>;
export type HokimTopicBoardQueryOutput = z.output<typeof HokimTopicBoardQuerySchema>;

export const HokimTopicBoardResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  calendarDay: z.string(),
  visitBaselineTimestamp: z.string().datetime().nullable(),
  currentVisitTimestamp: z.string().datetime(),
  serverEvaluatedAt: z.string().datetime(),
  hasProcessingDelay: z.boolean().default(false),
  lanes: z.record(QualifyingLaneSchema, HokimLaneBoardDataSchema),
});
export type HokimTopicBoardResponse = z.infer<typeof HokimTopicBoardResponseSchema>;

export const HokimLaneQuerySchema = z
  .object({
    lane: QualifyingLaneSchema,
    dateScope: DateFilterScopeSchema.default('today'),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    mahallaName: z.string().trim().min(1).optional(),
    calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    baselineTimestamp: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateScope === 'custom') {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси (dateFrom) киритилиши шарт.',
          path: ['dateFrom'],
        });
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Тугаш санаси (dateTo) киритилиши шарт.',
          path: ['dateTo'],
        });
      }
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.',
          path: ['dateFrom'],
        });
      }
    }
  });
export type HokimLaneQuery = z.input<typeof HokimLaneQuerySchema>;
export type HokimLaneQueryOutput = z.output<typeof HokimLaneQuerySchema>;

export const HokimLaneResponseSchema = z.object({
  lane: QualifyingLaneSchema,
  topics: z.array(TopicCardItemSchema),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});
export type HokimLaneResponse = z.infer<typeof HokimLaneResponseSchema>;

export const HokimMahallasResponseSchema = z.object({
  mahallas: z.array(z.string()),
});
export type HokimMahallasResponse = z.infer<typeof HokimMahallasResponseSchema>;

export const TopicEvidenceItemSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  verbatimText: z.string(),
  contentType: z.string(),
  originalTimestamp: z.string().datetime(),
  formattedTime: z.string(),
  authorName: z.string().nullable(),
  authorUsername: z.string().nullable(),
  isAnchor: z.boolean(),
  telegramDeepLink: z.string().nullable(),
});
export type TopicEvidenceItem = z.infer<typeof TopicEvidenceItemSchema>;

export const TopicEvidenceQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type TopicEvidenceQuery = z.input<typeof TopicEvidenceQuerySchema>;
export type TopicEvidenceQueryOutput = z.output<typeof TopicEvidenceQuerySchema>;

export const TopicEvidenceResponseSchema = z.object({
  topic: TopicCardItemSchema,
  anchorQuote: z.string(),
  anchorEvidenceId: z.string(),
  evidence: z.array(TopicEvidenceItemSchema),
  totalCount: z.number().int().min(0),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});
export type TopicEvidenceResponse = z.infer<typeof TopicEvidenceResponseSchema>;

export const TopicStatisticCard4Schema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('most_active_service_lane'),
    leaderLane: QualifyingLaneSchema.nullable(),
    leaderTopicCount: z.number().int().min(0),
    isTie: z.boolean(),
    tiedCount: z.number().int().min(0),
    isZero: z.boolean(),
  }),
  z.object({
    mode: z.literal('multi_lane_topics'),
    multiLaneTopicCount: z.number().int().min(0),
  }),
]);
export type TopicStatisticCard4 = z.infer<typeof TopicStatisticCard4Schema>;

export const TopicStatisticCard5Schema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('most_active_mahalla'),
    leaderMahalla: z.string().nullable(),
    leaderTopicCount: z.number().int().min(0),
    isTie: z.boolean(),
    tiedCount: z.number().int().min(0),
    isZero: z.boolean(),
  }),
  z.object({
    mode: z.literal('multi_evidence_topics'),
    multiEvidenceTopicCount: z.number().int().min(0),
  }),
]);
export type TopicStatisticCard5 = z.infer<typeof TopicStatisticCard5Schema>;

export const HokimTopicStatisticsQuerySchema = z
  .object({
    dateScope: DateFilterScopeSchema.default('today'),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    mahallaName: z.string().trim().min(1).optional(),
    lanes: LanesQueryParamSchema,
    calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateScope === 'custom') {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси (dateFrom) киритилиши шарт.',
          path: ['dateFrom'],
        });
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Тугаш санаси (dateTo) киритилиши шарт.',
          path: ['dateTo'],
        });
      }
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.',
          path: ['dateFrom'],
        });
      }
    }
  });
export type HokimTopicStatisticsQuery = z.input<typeof HokimTopicStatisticsQuerySchema>;
export type HokimTopicStatisticsQueryOutput = z.output<typeof HokimTopicStatisticsQuerySchema>;

export const HokimTopicStatisticsResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  calendarDay: z.string(),
  serverEvaluatedAt: z.string().datetime(),
  totalUniqueTopics: z.number().int().min(0),
  hokimRelatedTopics: z.number().int().min(0),
  hokimEvidenceCount: z.number().int().min(0),
  activeMahallasCount: z.number().int().min(0),
  totalAcceptedEvidenceCount: z.number().int().min(0),
  card4: TopicStatisticCard4Schema,
  card5: TopicStatisticCard5Schema,
});
export type HokimTopicStatisticsResponse = z.infer<typeof HokimTopicStatisticsResponseSchema>;

export const HokimTopicBoardSearchBodySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак')
      .optional(),
    dateScope: DateFilterScopeSchema.default('today'),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    mahallaName: z.string().trim().min(1).optional(),
    lanes: LanesQueryParamSchema,
    calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    baselineTimestamp: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateScope === 'custom') {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси (dateFrom) киритилиши шарт.',
          path: ['dateFrom'],
        });
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Тугаш санаси (dateTo) киритилиши шарт.',
          path: ['dateTo'],
        });
      }
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.',
          path: ['dateFrom'],
        });
      }
    }
  });
export type HokimTopicBoardSearchBody = z.input<typeof HokimTopicBoardSearchBodySchema>;
export type HokimTopicBoardSearchBodyOutput = z.output<typeof HokimTopicBoardSearchBodySchema>;

export const HokimLaneSearchBodySchema = z
  .object({
    lane: QualifyingLaneSchema,
    search: z
      .string()
      .trim()
      .max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак')
      .optional(),
    dateScope: DateFilterScopeSchema.default('today'),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    mahallaName: z.string().trim().min(1).optional(),
    calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    baselineTimestamp: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateScope === 'custom') {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси (dateFrom) киритилиши шарт.',
          path: ['dateFrom'],
        });
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Тугаш санаси (dateTo) киритилиши шарт.',
          path: ['dateTo'],
        });
      }
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.',
          path: ['dateFrom'],
        });
      }
    }
  });
export type HokimLaneSearchBody = z.input<typeof HokimLaneSearchBodySchema>;
export type HokimLaneSearchBodyOutput = z.output<typeof HokimLaneSearchBodySchema>;

export const HokimTopicStatisticsSearchBodySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак')
      .optional(),
    dateScope: DateFilterScopeSchema.default('today'),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак')
      .optional(),
    mahallaName: z.string().trim().min(1).optional(),
    lanes: LanesQueryParamSchema,
    calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateScope === 'custom') {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси (dateFrom) киритилиши шарт.',
          path: ['dateFrom'],
        });
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Тугаш санаси (dateTo) киритилиши шарт.',
          path: ['dateTo'],
        });
      }
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.',
          path: ['dateFrom'],
        });
      }
    }
  });
export type HokimTopicStatisticsSearchBody = z.input<typeof HokimTopicStatisticsSearchBodySchema>;
export type HokimTopicStatisticsSearchBodyOutput = z.output<typeof HokimTopicStatisticsSearchBodySchema>;




