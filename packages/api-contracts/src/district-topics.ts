import { z } from 'zod';
import {
  QualifyingLane,
  DateFilterScope,
  TopicDateFilterFields,
  LanesQueryParamSchema,
  refineDateScopeRange,
  TopicCardItemSchema,
} from './topics.js';

export const DistrictTopicsFilterFields = {
  ...TopicDateFilterFields,
  mahallaName: z.string().trim().min(1).optional(),
  lanes: LanesQueryParamSchema,
  calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const DistrictTopicsQuerySchema = z
  .object(DistrictTopicsFilterFields)
  .superRefine(refineDateScopeRange);

export interface DistrictTopicsQuery {
  dateScope?: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  calendarDay?: string;
  mahallaName?: string;
  lanes?: QualifyingLane[];
  cursor?: string;
  limit?: number;
}

export type DistrictTopicsQueryInput = z.input<typeof DistrictTopicsQuerySchema>;
export type DistrictTopicsQueryOutput = z.output<typeof DistrictTopicsQuerySchema>;

export const DistrictTopicsSearchBodySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак')
      .optional(),
    ...DistrictTopicsFilterFields,
  })
  .superRefine(refineDateScopeRange);

export interface DistrictTopicsSearchBody {
  search?: string;
  dateScope?: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  calendarDay?: string;
  mahallaName?: string;
  lanes?: QualifyingLane[];
  cursor?: string;
  limit?: number;
}

export type DistrictTopicsSearchBodyInput = z.input<typeof DistrictTopicsSearchBodySchema>;
export type DistrictTopicsSearchBodyOutput = z.output<typeof DistrictTopicsSearchBodySchema>;

export const DistrictTopicsPageResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  topics: z.array(TopicCardItemSchema),
  totalCount: z.number().int().min(0),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
  serverEvaluatedAt: z.string().datetime(),
});

export type DistrictTopicsPageResponse = z.infer<typeof DistrictTopicsPageResponseSchema>;

export const DistrictMahallasResponseSchema = z.object({
  mahallas: z.array(z.string()),
});

export type DistrictMahallasResponse = z.infer<typeof DistrictMahallasResponseSchema>;
