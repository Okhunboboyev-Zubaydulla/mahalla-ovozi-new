import { z } from 'zod';

/**
 * Six canonical health states defined in Story 4.1 (FR-25, FR-28, AD-11).
 */
export const HealthStatusEnumSchema = z.enum([
  'Healthy',
  'Delayed',
  'Degraded',
  'Unavailable',
  'Quiet',
  'Unknown',
]);
export type HealthStatus = z.infer<typeof HealthStatusEnumSchema>;

/**
 * Component scope declaration (GLOBAL infrastructure vs DISTRICT operational).
 */
export const ComponentScopeEnumSchema = z.enum(['GLOBAL', 'DISTRICT']);
export type ComponentScope = z.infer<typeof ComponentScopeEnumSchema>;

/**
 * Canonical monitored component types registered with the health boundary.
 */
export const ComponentTypeEnumSchema = z.enum([
  'database',
  'processing_queue',
  'storage',
  'web_application',
  'telegram_bot',
  'telegram_groups',
  'message_intake',
  'ai_operations',
  'retention_jobs',
  'district_retention',
]);
export type ComponentType = z.infer<typeof ComponentTypeEnumSchema>;

/**
 * Technical outcome category distinguishing confirmation, failure, and insufficient evidence.
 */
export const TechnicalOutcomeSchema = z.enum([
  'success',
  'failure',
  'insufficient_evidence',
]);
export type TechnicalOutcome = z.infer<typeof TechnicalOutcomeSchema>;

/**
 * Privacy-safe technical health observation contract.
 */
export const ComponentHealthObservationSchema = z.object({
  component: ComponentTypeEnumSchema,
  scope: ComponentScopeEnumSchema,
  districtId: z.string().min(1).nullable(),
  status: HealthStatusEnumSchema,
  lastCheckAt: z.string().datetime(),
  checkedAt: z.string().datetime(),
  outcome: TechnicalOutcomeSchema,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  latencyMs: z.number().nonnegative().nullable(),
  isApplicable: z.boolean(),
  lifecycleStatus: z.string().nullable(),
});
export type ComponentHealthObservation = z.infer<typeof ComponentHealthObservationSchema>;

/**
 * Per-district summary item in overall health aggregation.
 */
export const DistrictHealthSummarySchema = z.object({
  districtId: z.string().min(1),
  districtName: z.string(),
  status: HealthStatusEnumSchema,
  lastCheckAt: z.string().datetime(),
  components: z.array(ComponentHealthObservationSchema),
  lifecycleStatus: z.string().nullable(),
});
export type DistrictHealthSummary = z.infer<typeof DistrictHealthSummarySchema>;

/**
 * Application-owned overall product health API response (`/api/v1/health/system`).
 */
export const OverallSystemHealthResponseSchema = z.object({
  status: HealthStatusEnumSchema,
  lastCheckAt: z.string().datetime(),
  evaluatedAt: z.string().datetime(),
  globalComponents: z.array(ComponentHealthObservationSchema),
  districts: z.array(DistrictHealthSummarySchema),
  totalDistricts: z.number().int().nonnegative(),
  activeDistricts: z.number().int().nonnegative(),
});
export type OverallSystemHealthResponse = z.infer<typeof OverallSystemHealthResponseSchema>;

/**
 * District-scoped health API response (`/api/v1/districts/:districtId/health`).
 */
export const DistrictHealthResponseSchema = z.object({
  districtId: z.string().min(1),
  districtName: z.string(),
  status: HealthStatusEnumSchema,
  lastCheckAt: z.string().datetime(),
  evaluatedAt: z.string().datetime(),
  components: z.array(ComponentHealthObservationSchema),
  lifecycleStatus: z.string().nullable(),
});
export type DistrictHealthResponse = z.infer<typeof DistrictHealthResponseSchema>;
