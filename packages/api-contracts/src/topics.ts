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

export const HokimTopicBoardQuerySchema = z.object({
  calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  baselineTimestamp: z.string().datetime().optional(),
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

export const HokimLaneQuerySchema = z.object({
  lane: QualifyingLaneSchema,
  calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  baselineTimestamp: z.string().datetime().optional(),
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


