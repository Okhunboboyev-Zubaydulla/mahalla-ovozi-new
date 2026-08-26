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

export const AuditEventSchema = z.object({
  id: z.string(),
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

export const AuditEventDetailSchema = AuditEventSchema;
export type AuditEventDetail = z.infer<typeof AuditEventDetailSchema>;

export const AuditHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.preprocess((val) => (val === '' ? undefined : val), z.string().min(1).optional()),
    direction: z.enum(['forward', 'backward']).default('forward'),
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

export const AuditHistoryPageSchema = createKeysetPageSchema(AuditEventSchema);
export type AuditHistoryPage = KeysetPage<AuditEvent>;

export interface AuditKeysetCursorPayload extends KeysetCursorPayload {
  id: string;
  createdAt: string; // ISO string
}

export const ALLOWED_METADATA_SEARCH_KEYS = [
  'reason',
  'errorCode',
  'issueId',
  'botUsername',
  'groupId',
  'chatId',
  'retryTrackingId',
] as const;
