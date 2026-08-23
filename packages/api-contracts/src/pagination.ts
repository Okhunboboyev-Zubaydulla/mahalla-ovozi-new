import { z } from 'zod';

export const CursorPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
});
export type CursorPaginationQuery = z.infer<typeof CursorPaginationQuerySchema>;

export const CursorPaginationMetaSchema = z.object({
  limit: z.number().int().min(1),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
  nextCursor: z.string().nullable().optional(),
  prevCursor: z.string().nullable().optional(),
  totalCount: z.number().int().min(0).optional(),
});
export type CursorPaginationMeta = z.infer<typeof CursorPaginationMetaSchema>;
