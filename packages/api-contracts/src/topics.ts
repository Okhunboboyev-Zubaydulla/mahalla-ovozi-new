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
