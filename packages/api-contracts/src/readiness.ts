import { z } from 'zod';
import { DistrictStatusSchema } from './districts.js';

export const PrerequisiteStatusSchema = z.enum(['passed', 'incomplete', 'failed']);
export type PrerequisiteStatus = z.infer<typeof PrerequisiteStatusSchema>;

export const PrerequisiteKeySchema = z.enum([
  'district_identity',
  'access_eligibility',
  'analysis_configuration',
  'district_isolation',
  'disclosure_confirmation',
  'telegram_bot',
  'group_mappings',
  'hokim_account',
]);
export type PrerequisiteKey = z.infer<typeof PrerequisiteKeySchema>;

export const PrerequisiteItemSchema = z.object({
  key: PrerequisiteKeySchema,
  label: z.string().min(1),
  description: z.string().min(1),
  status: PrerequisiteStatusSchema,
  blockerReason: z.string().optional(),
  actionRequired: z.boolean().optional(),
  actionPath: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  completedBy: z.string().optional(),
});
export type PrerequisiteItem = z.infer<typeof PrerequisiteItemSchema>;

export const DistrictReadinessSchema = z.object({
  districtId: z.string().min(1),
  districtName: z.string().min(1),
  status: DistrictStatusSchema,
  isActivationReady: z.boolean(),
  passedCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  evaluatedAt: z.string().datetime(),
  items: z.array(PrerequisiteItemSchema),
  disclosureConfirmedAt: z.string().datetime().nullable(),
  disclosureConfirmedById: z.string().nullable(),
});
export type DistrictReadiness = z.infer<typeof DistrictReadinessSchema>;

export const GetDistrictReadinessResponseSchema = z.object({
  readiness: DistrictReadinessSchema,
});
export type GetDistrictReadinessResponse = z.infer<typeof GetDistrictReadinessResponseSchema>;

export const ConfirmDisclosureResponseSchema = z.object({
  districtId: z.string().min(1),
  disclosureConfirmedAt: z.string().datetime(),
  disclosureConfirmedById: z.string().min(1),
});
export type ConfirmDisclosureResponse = z.infer<typeof ConfirmDisclosureResponseSchema>;
