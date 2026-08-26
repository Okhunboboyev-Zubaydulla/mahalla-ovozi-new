import { z } from 'zod';

/**
 * Supported operation types eligible for safe manual retry (Story 4.3 AC 1, AC 2, AC 6).
 */
export const RetryableOperationTypeEnumSchema = z.enum([
  'TELEGRAM_CONTENT_QUALIFICATION',
  'TELEGRAM_SEMANTIC_RELEVANCE',
  'TELEGRAM_TOPIC_ASSIGNMENT',
  'TELEGRAM_TOPIC_PROJECTION',
  'TELEGRAM_TOPIC_RETENTION',
  'HEALTH_CHECK_SYNC',
]);
export type RetryableOperationType = z.infer<
  typeof RetryableOperationTypeEnumSchema
>;

/**
 * Standard error codes returned for rejected retry requests (Story 4.3 AC 2, AC 6).
 */
export const RetryErrorCodeEnumSchema = z.enum([
  'OPERATION_INELIGIBLE',
  'DUPLICATE_RETRY_IN_PROGRESS',
  'OPERATION_ALREADY_COMPLETED',
  'OPERATION_NOT_FOUND',
  'DISTRICT_ACCESS_REVOKED',
]);
export type RetryErrorCode = z.infer<typeof RetryErrorCodeEnumSchema>;

/**
 * Request payload for manual retry execution (`POST /api/v1/issues/:issueId/retry` or `POST /api/v1/retry/jobs`).
 */
export const RetryOperationRequestSchema = z.object({
  issueId: z.string().optional(),
  operationType: RetryableOperationTypeEnumSchema.optional(),
  targetId: z.string().optional(),
  reason: z.string().max(500).optional(),
});
export type RetryOperationRequest = z.infer<
  typeof RetryOperationRequestSchema
>;

/**
 * Response payload returned when a retry request is accepted into the background queue.
 */
export const RetryOperationResponseSchema = z.object({
  accepted: z.boolean(),
  retryTrackingId: z.string(),
  operationType: z.string(),
  targetId: z.string(),
  queuedAt: z.string().datetime(),
  message: z.string(),
});
export type RetryOperationResponse = z.infer<
  typeof RetryOperationResponseSchema
>;
