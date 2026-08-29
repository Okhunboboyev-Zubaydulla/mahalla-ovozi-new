import { z } from 'zod';
import { createKeysetPageSchema, KeysetPage, KeysetCursorPayload } from './pagination.js';

export const AuditActionCategoryEnumSchema = z.enum([
  'AUTH_SECURITY',
  'DISTRICT_ADMINISTRATION',
  'HOKIM_MANAGEMENT',
  'TELEGRAM_INTEGRATION',
  'OPERATIONAL_LIFECYCLE',
]);
export type AuditActionCategory = z.infer<typeof AuditActionCategoryEnumSchema>;

export const AuditActionOutcomeEnumSchema = z.enum(['SUCCESS', 'FAILURE']);
export type AuditActionOutcome = z.infer<typeof AuditActionOutcomeEnumSchema>;

export const AuditActorRoleEnumSchema = z.enum([
  'PRODUCT_OWNER',
  'DISTRICT_HOKIM',
  'SYSTEM',
]);
export type AuditActorRole = z.infer<typeof AuditActorRoleEnumSchema>;

export const PermanentDeletionProofSchema = z.object({
  id: z.string(),
  recordType: z.literal('PERMANENT_DELETION_PROOF').default('PERMANENT_DELETION_PROOF'),
  districtId: z.string(),
  districtName: z.string(),
  cancelledAt: z.string().datetime().nullable().optional(),
  cancelledById: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  scheduledLiveDeletionAt: z.string().datetime(),
  actualLiveDeletionAt: z.string().datetime(),
  liveDeletionStatus: z.enum(['COMPLETED', 'FAILED']),
  protectedBackupExpiryDeadline: z.string().datetime(),
  backupExpiryStatus: z.enum(['PENDING', 'VERIFIED', 'FAILED']),
  backupExpiryVerifiedAt: z.string().datetime().nullable().optional(),
  restoreReconciliationStatus: z
    .enum(['PENDING', 'RECONCILED', 'FAILED'])
    .nullable()
    .optional(),
  restoreReconciliationVerifiedAt: z.string().datetime().nullable().optional(),
  lifecycleComplete: z.boolean(),
  createdAt: z.string().datetime(),
});
export type PermanentDeletionProof = z.infer<typeof PermanentDeletionProofSchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  recordType: z.literal('AUDIT_EVENT').default('AUDIT_EVENT'),
  districtId: z.string().nullable(),
  districtName: z.string().nullable().optional(),
  actorId: z.string().nullable(),
  actorRole: AuditActorRoleEnumSchema.nullable(),
  action: z.string(),
  category: AuditActionCategoryEnumSchema,
  outcome: AuditActionOutcomeEnumSchema,
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  previousValues: z.record(z.unknown()).nullable().optional(),
  newValues: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AuditHistoryItemSchema = z.discriminatedUnion('recordType', [
  AuditEventSchema,
  PermanentDeletionProofSchema,
]);
export type AuditHistoryItem = z.infer<typeof AuditHistoryItemSchema>;

export const AuditEventDetailSchema = AuditHistoryItemSchema;
export type AuditEventDetail = z.infer<typeof AuditEventDetailSchema>;

export const AuditHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.preprocess((val) => (val === '' ? undefined : val), z.string().min(1).optional()),
    direction: z.enum(['forward', 'backward']).default('forward'),
    recordType: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.enum(['ALL', 'AUDIT_EVENT', 'PERMANENT_DELETION_PROOF']).default('ALL'),
    ),
    districtId: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
    startDate: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required')
        .refine((val) => !Number.isNaN(Date.parse(val)), 'Нотўғри сана киритилди.')
        .optional(),
    ),
    endDate: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required')
        .refine((val) => !Number.isNaN(Date.parse(val)), 'Нотўғри сана киритилди.')
        .optional(),
    ),
    category: z.preprocess((val) => (val === '' ? undefined : val), AuditActionCategoryEnumSchema.optional()),
    actorRole: z.preprocess((val) => (val === '' ? undefined : val), AuditActorRoleEnumSchema.optional()),
    outcome: z.preprocess((val) => (val === '' ? undefined : val), AuditActionOutcomeEnumSchema.optional()),
    action: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
    search: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(100).optional()),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      message: 'Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас.',
      path: ['startDate'],
    },
  );
export type AuditHistoryQuery = z.infer<typeof AuditHistoryQuerySchema>;

export const AuditHistoryPageSchema = createKeysetPageSchema(AuditHistoryItemSchema);
export type AuditHistoryPage = KeysetPage<AuditHistoryItem>;

export interface AuditKeysetCursorPayload extends KeysetCursorPayload {
  id: string;
  createdAt: string; // ISO string
}

export const ALLOWED_METADATA_SEARCH_KEYS = [
  'reason',
  'errorCode',
  'error',
  'issueId',
  'botUsername',
  'groupId',
  'chatId',
  'retryTrackingId',
  'districtId',
  'districtName',
  'mahallaName',
  'deletedDistrictId',
  'deletedDistrictName',
  'oldestActiveBackupTimestamp',
  'verificationMethod',
  'backupExpiryDeadline',
  'protectedBackupExpiryDeadline',
  'resurrectedDistrictsPurged',
  'districtsEvaluated',
  'expiredTopicsPurged',
  'expiredEvidencePurged',
  'expiredProjectionsPurged',
  'staleJobsPurged',
  'tombstonesSynchronized',
  'durationMs',
] as const;

export const DISTRICT_LIFECYCLE_AUDIT_ACTIONS = [
  'DISTRICT_GRACE_STARTED',
  'DISTRICT_SUBSCRIPTION_SUSPENDED',
  'DISTRICT_SERVICE_RESTORED_ACTIVE',
  'DISTRICT_CANCELLED',
  'DISTRICT_RECOVERY_STARTED',
  'DISTRICT_LIVE_DELETED',
  'DISTRICT_BACKUP_EXPIRY_VERIFIED',
  'DISTRICT_BACKUP_EXPIRY_FAILED',
  'DISTRICT_RESTORE_RECONCILED',
  'DISTRICT_RESTORE_RECONCILIATION_FAILED',
] as const;

