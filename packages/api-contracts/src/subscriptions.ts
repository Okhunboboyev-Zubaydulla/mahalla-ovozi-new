import { z } from 'zod';
import { containsProhibitedSecrets } from './analysis-settings.js';
import { PrerequisiteItemSchema } from './readiness.js';

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

export const ScheduledTransitionTypeSchema = z.enum([
  'AUTOMATIC_SUSPENSION',
  'LIVE_DELETION',
]);
export type ScheduledTransitionType = z.infer<typeof ScheduledTransitionTypeSchema>;

export const StartGraceRequestSchema = z
  .object({
    reason: z
      .string({ invalid_type_error: 'Сабаб матн кўринишида бўлиши керак.' })
      .trim()
      .max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason && containsProhibitedSecrets(data.reason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type StartGraceRequest = z.infer<typeof StartGraceRequestSchema>;

export const StartGraceResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type StartGraceResponse = z.infer<typeof StartGraceResponseSchema>;

export const RestoreActiveRequestSchema = z
  .object({
    reason: z
      .string({ invalid_type_error: 'Сабаб матн кўринишида бўлиши керак.' })
      .trim()
      .max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason && containsProhibitedSecrets(data.reason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type RestoreActiveRequest = z.infer<typeof RestoreActiveRequestSchema>;

export const RestoreActiveResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type RestoreActiveResponse = z.infer<typeof RestoreActiveResponseSchema>;

export const DistrictNotReadyErrorSchema = z.object({
  code: z.literal('DISTRICT_NOT_READY'),
  message: z.string(),
  blockers: z.array(PrerequisiteItemSchema),
});
export type DistrictNotReadyError = z.infer<typeof DistrictNotReadyErrorSchema>;

export const CancelDistrictRequestSchema = z
  .object({
    reason: z
      .string({ invalid_type_error: 'Бекор қилиш сабаби матн кўринишида бўлиши керак.' })
      .trim()
      .min(1, 'Бекор қилиш сабабини киритинг.')
      .max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.'),
    confirmationDistrictName: z
      .string({ invalid_type_error: 'Туман номи матн кўринишида бўлиши керак.' })
      .trim()
      .min(1, 'Туман номини тасдиқлаш учун тўлиқ киритинг.')
      .max(255, 'Туман номи 255 та белгидан ошмаслиги керак.'),
  })
  .superRefine((data, ctx) => {
    if (data.reason && containsProhibitedSecrets(data.reason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type CancelDistrictRequest = z.infer<typeof CancelDistrictRequestSchema>;

export const CancelDistrictResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type CancelDistrictResponse = z.infer<typeof CancelDistrictResponseSchema>;

export const StartRecoveryRequestSchema = z
  .object({
    reason: z
      .string({ invalid_type_error: 'Сабаб матн кўринишида бўлиши керак.' })
      .trim()
      .max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason && containsProhibitedSecrets(data.reason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type StartRecoveryRequest = z.infer<typeof StartRecoveryRequestSchema>;

export const StartRecoveryResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type StartRecoveryResponse = z.infer<typeof StartRecoveryResponseSchema>;

export const DistrictConfirmationMismatchErrorSchema = z.object({
  code: z.literal('DISTRICT_CONFIRMATION_MISMATCH'),
  message: z.string(),
});
export type DistrictConfirmationMismatchError = z.infer<typeof DistrictConfirmationMismatchErrorSchema>;

export const RecoveryWindowExpiredErrorSchema = z.object({
  code: z.literal('RECOVERY_WINDOW_EXPIRED'),
  message: z.string(),
});
export type RecoveryWindowExpiredError = z.infer<typeof RecoveryWindowExpiredErrorSchema>;

export const DistrictDeletionRecordSchema = z.object({
  id: z.string().min(1),
  districtId: z.string().min(1),
  districtName: z.string().min(1),
  cancelledAt: z.string().datetime().nullable().optional(),
  cancelledById: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  scheduledLiveDeletionAt: z.string().datetime(),
  actualLiveDeletionAt: z.string().datetime(),
  liveDeletionStatus: z.enum(['COMPLETED', 'FAILED']),
  protectedBackupExpiryDeadline: z.string().datetime(),
  backupExpiryStatus: z.enum(['PENDING', 'VERIFIED', 'FAILED']),
  backupExpiryVerifiedAt: z.string().datetime().nullable().optional(),
  restoreReconciliationStatus: z.enum(['PENDING', 'RECONCILED', 'FAILED']).nullable().optional(),
  restoreReconciliationVerifiedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DistrictDeletionRecord = z.infer<typeof DistrictDeletionRecordSchema>;

export const GetDistrictDeletionRecordResponseSchema = z.object({
  deletionRecord: DistrictDeletionRecordSchema,
});
export type GetDistrictDeletionRecordResponse = z.infer<typeof GetDistrictDeletionRecordResponseSchema>;

export const ExecuteLiveDeletionResponseSchema = z.object({
  deletionRecord: DistrictDeletionRecordSchema,
  message: z.string(),
});
export type ExecuteLiveDeletionResponse = z.infer<typeof ExecuteLiveDeletionResponseSchema>;

export const DistrictAlreadyDeletedErrorSchema = z.object({
  code: z.literal('DISTRICT_ALREADY_DELETED'),
  message: z.string(),
});
export type DistrictAlreadyDeletedError = z.infer<typeof DistrictAlreadyDeletedErrorSchema>;

export const DistrictNotEligibleForDeletionErrorSchema = z.object({
  code: z.literal('DISTRICT_NOT_ELIGIBLE_FOR_DELETION'),
  message: z.string(),
});
export type DistrictNotEligibleForDeletionError = z.infer<typeof DistrictNotEligibleForDeletionErrorSchema>;

export const VerifyBackupExpiryResponseSchema = z.object({
  deletionRecord: DistrictDeletionRecordSchema,
  isExpired: z.boolean(),
  message: z.string(),
});
export type VerifyBackupExpiryResponse = z.infer<typeof VerifyBackupExpiryResponseSchema>;

export const BackupExpiryVerificationDetailsSchema = z.object({
  isExpired: z.boolean(),
  oldestActiveBackupTimestamp: z.string().datetime().nullable().optional(),
  verificationMethod: z.string(),
  rawDetails: z.record(z.unknown()).optional(),
});
export type BackupExpiryVerificationDetails = z.infer<typeof BackupExpiryVerificationDetailsSchema>;



