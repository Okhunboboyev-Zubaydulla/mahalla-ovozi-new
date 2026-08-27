import { z } from 'zod';
import { containsProhibitedSecrets } from './analysis-settings.js';

export const SubscriptionStatusSchema = z.enum([
  'SETUP_INCOMPLETE',
  'ACTIVE',
  'GRACE',
  'SUSPENDED',
  'CANCELLED',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const DistrictSubscriptionSchema = z.object({
  id: z.string().min(1),
  districtId: z.string().min(1),
  districtName: z.string().min(1),
  region: z.string().nullable().optional(),
  status: SubscriptionStatusSchema,
  statusStartedAt: z.string().datetime(), // ISO 8601 UTC
  scheduledTransitionAt: z.string().datetime().nullable().optional(),
  scheduledTransitionType: z.string().nullable().optional(),
  externalPaymentReference: z.string().nullable().optional(),
  internalNote: z.string().nullable().optional(),
  updatedById: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DistrictSubscription = z.infer<typeof DistrictSubscriptionSchema>;

export const ListDistrictSubscriptionsResponseSchema = z.object({
  subscriptions: z.array(DistrictSubscriptionSchema),
});
export type ListDistrictSubscriptionsResponse = z.infer<typeof ListDistrictSubscriptionsResponseSchema>;

export const GetDistrictSubscriptionResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
});
export type GetDistrictSubscriptionResponse = z.infer<typeof GetDistrictSubscriptionResponseSchema>;

export const UpdateDistrictSubscriptionRequestSchema = z
  .object({
    externalPaymentReference: z
      .string({ invalid_type_error: 'Тўлов маълумотномаси матн кўринишида бўлиши керак.' })
      .trim()
      .max(255, 'Тўлов маълумотномаси 255 та белгидан ошмаслиги керак.')
      .nullish(),
    internalNote: z
      .string({ invalid_type_error: 'Ички қайд матн кўринишида бўлиши керак.' })
      .trim()
      .max(2000, 'Ички қайд 2000 та белгидан ошмаслиги керак.')
      .nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.externalPaymentReference && containsProhibitedSecrets(data.externalPaymentReference)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['externalPaymentReference'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
    if (data.internalNote && containsProhibitedSecrets(data.internalNote)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['internalNote'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type UpdateDistrictSubscriptionRequest = z.infer<typeof UpdateDistrictSubscriptionRequestSchema>;

export const UpdateDistrictSubscriptionResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type UpdateDistrictSubscriptionResponse = z.infer<typeof UpdateDistrictSubscriptionResponseSchema>;
