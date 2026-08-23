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
});
export type HokimTopicBoardQuery = z.input<typeof HokimTopicBoardQuerySchema>;
export type HokimTopicBoardQueryOutput = z.output<typeof HokimTopicBoardQuerySchema>;

export const HokimTopicBoardResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  calendarDay: z.string(),
  visitBaselineTimestamp: z.string().datetime().nullable(),
  currentVisitTimestamp: z.string().datetime(),
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

