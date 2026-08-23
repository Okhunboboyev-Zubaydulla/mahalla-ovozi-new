import { eq, and, desc, asc, gte, lte, sql, SQL } from 'drizzle-orm';
import type { DbOrTx } from '../../adapters/db/client.js';
import {
  aiOperations,
  aiProfiles,
  aiProviderAttempts,
  type AiProviderAttempt,
} from '../../adapters/db/schema/ai.js';
import type { AiGatewayErrorCode } from './types.js';
import type {
  AiOperationFilter,
  AiOperationListItem,
  AiOperationDetailRecord,
  PaginatedResult,
  AiOperationHealthMetrics,
} from './ai-operation-types.js';

function buildFilterConditions(filter: AiOperationFilter): SQL[] {
  const conditions: SQL[] = [];

  if (filter.districtId) {
    conditions.push(eq(aiOperations.districtId, filter.districtId));
  }
  if (filter.mahallaName) {
    conditions.push(eq(aiOperations.mahallaName, filter.mahallaName));
  }
  if (filter.calendarDay) {
    conditions.push(eq(aiOperations.calendarDay, filter.calendarDay));
  }
  if (filter.operationType) {
    conditions.push(eq(aiOperations.operationType, filter.operationType));
  }
  if (filter.finalStatus) {
    conditions.push(eq(aiOperations.finalStatus, filter.finalStatus));
  }
  if (filter.targetId) {
    conditions.push(eq(aiOperations.targetId, filter.targetId));
  }
  if (filter.startDate) {
    conditions.push(gte(aiOperations.createdAt, filter.startDate));
  }
  if (filter.endDate) {
    conditions.push(lte(aiOperations.createdAt, filter.endDate));
  }

  return conditions;
}

export async function findOperations(
  db: DbOrTx,
  filter: AiOperationFilter,
): Promise<PaginatedResult<AiOperationListItem>> {
  const conditions = buildFilterConditions(filter);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize = filter.pageSize && filter.pageSize > 0 ? Math.min(filter.pageSize, 200) : 50;
  const offset = (page - 1) * pageSize;

  const countQuery = db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(aiOperations)
    .where(whereClause);

  const itemsQuery = db
    .select({
      id: aiOperations.id,
      districtId: aiOperations.districtId,
      mahallaName: aiOperations.mahallaName,
      calendarDay: aiOperations.calendarDay,
      operationType: aiOperations.operationType,
      targetId: aiOperations.targetId,
      pinnedProfileId: aiOperations.pinnedProfileId,
      contextRevision: aiOperations.contextRevision,
      snapshotFingerprint: aiOperations.snapshotFingerprint,
      finalStatus: aiOperations.finalStatus,
      createdAt: aiOperations.createdAt,
      updatedAt: aiOperations.updatedAt,
      attemptCount: sql<number>`coalesce(count(${aiProviderAttempts.id}), 0)::int`.mapWith(Number),
      totalCostUsd: sql<number>`coalesce(sum(${aiProviderAttempts.estimatedCostUsd}::numeric), 0)::float`.mapWith(Number),
    })
    .from(aiOperations)
    .leftJoin(aiProviderAttempts, eq(aiOperations.id, aiProviderAttempts.operationId))
    .where(whereClause)
    .groupBy(aiOperations.id)
    .orderBy(desc(aiOperations.createdAt), desc(aiOperations.id))
    .limit(pageSize)
    .offset(offset);

  const [countResult, items] = await Promise.all([countQuery, itemsQuery]);
  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}

export async function findOperationsByDistrict(
  db: DbOrTx,
  filter: AiOperationFilter & { districtId: string },
): Promise<PaginatedResult<AiOperationListItem>> {
  return findOperations(db, filter);
}

export async function findOperationsGlobal(
  db: DbOrTx,
  filter: AiOperationFilter,
): Promise<PaginatedResult<AiOperationListItem>> {
  return findOperations(db, filter);
}

export async function findOperationDetailsById(
  db: DbOrTx,
  districtId: string,
  operationId: string,
): Promise<AiOperationDetailRecord | null> {
  const [operation] = await db
    .select()
    .from(aiOperations)
    .where(and(eq(aiOperations.id, operationId), eq(aiOperations.districtId, districtId)))
    .limit(1);

  if (!operation) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(aiProfiles)
    .where(eq(aiProfiles.id, operation.pinnedProfileId))
    .limit(1);

  if (!profile) {
    return null;
  }

  const attempts = await db
    .select()
    .from(aiProviderAttempts)
    .where(eq(aiProviderAttempts.operationId, operationId))
    .orderBy(asc(aiProviderAttempts.attemptNumber));

  return {
    operation,
    profile,
    attempts,
  };
}

export async function findOperationDetailsByIdGlobal(
  db: DbOrTx,
  operationId: string,
): Promise<AiOperationDetailRecord | null> {
  const [operation] = await db
    .select()
    .from(aiOperations)
    .where(eq(aiOperations.id, operationId))
    .limit(1);

  if (!operation) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(aiProfiles)
    .where(eq(aiProfiles.id, operation.pinnedProfileId))
    .limit(1);

  if (!profile) {
    return null;
  }

  const attempts = await db
    .select()
    .from(aiProviderAttempts)
    .where(eq(aiProviderAttempts.operationId, operationId))
    .orderBy(asc(aiProviderAttempts.attemptNumber));

  return {
    operation,
    profile,
    attempts,
  };
}

export async function findAttemptsByOperationId(
  db: DbOrTx,
  operationId: string,
): Promise<AiProviderAttempt[]> {
  return db
    .select()
    .from(aiProviderAttempts)
    .where(eq(aiProviderAttempts.operationId, operationId))
    .orderBy(asc(aiProviderAttempts.attemptNumber));
}

export async function aggregateHealthMetrics(
  db: DbOrTx,
  districtId?: string,
  timeframe?: { from: Date; to: Date },
): Promise<AiOperationHealthMetrics> {
  const opConditions: SQL[] = [];
  if (districtId) {
    opConditions.push(eq(aiOperations.districtId, districtId));
  }
  if (timeframe?.from) {
    opConditions.push(gte(aiOperations.createdAt, timeframe.from));
  }
  if (timeframe?.to) {
    opConditions.push(lte(aiOperations.createdAt, timeframe.to));
  }
  const opWhereClause = opConditions.length > 0 ? and(...opConditions) : undefined;

  const attConditions: SQL[] = [];
  if (districtId) {
    attConditions.push(eq(aiOperations.districtId, districtId));
  }
  if (timeframe?.from) {
    attConditions.push(gte(aiProviderAttempts.createdAt, timeframe.from));
  }
  if (timeframe?.to) {
    attConditions.push(lte(aiProviderAttempts.createdAt, timeframe.to));
  }
  const attWhereClause = attConditions.length > 0 ? and(...attConditions) : undefined;

  // 1. Grouped operations count by type and status
  const operationsGrouped = await db
    .select({
      operationType: aiOperations.operationType,
      finalStatus: aiOperations.finalStatus,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(aiOperations)
    .where(opWhereClause)
    .groupBy(aiOperations.operationType, aiOperations.finalStatus);

  let totalOperations = 0;
  const operationsByType: Record<string, number> = {
    SEMANTIC_RELEVANCE: 0,
    TOPIC_MATCHING: 0,
    TOPIC_DERIVED_PROJECTION: 0,
  };
  const operationsByStatus: Record<string, number> = {
    COMPLETED_RELEVANT: 0,
    COMPLETED_IRRELEVANT: 0,
    COMPLETED_MATCHED: 0,
    COMPLETED_NEW_TOPIC: 0,
    COMPLETED: 0,
    FAILED_EXPLICIT: 0,
    STALE: 0,
  };

  for (const row of operationsGrouped) {
    totalOperations += row.count;
    operationsByType[row.operationType] = (operationsByType[row.operationType] ?? 0) + row.count;
    operationsByStatus[row.finalStatus] = (operationsByStatus[row.finalStatus] ?? 0) + row.count;
  }

  // 2. Aggregate attempt metrics (tokens, cost, latency statistics)
  const [statsResult] = await db
    .select({
      totalAttempts: sql<number>`coalesce(count(${aiProviderAttempts.id}), 0)::int`.mapWith(Number),
      totalInputTokens: sql<number>`coalesce(sum(${aiProviderAttempts.inputTokens}), 0)::int`.mapWith(Number),
      totalOutputTokens: sql<number>`coalesce(sum(${aiProviderAttempts.outputTokens}), 0)::int`.mapWith(Number),
      totalCachedTokens: sql<number>`coalesce(sum(${aiProviderAttempts.cachedTokens}), 0)::int`.mapWith(Number),
      totalEstimatedCostUsd: sql<number>`coalesce(sum(${aiProviderAttempts.estimatedCostUsd}::numeric), 0)::float`.mapWith(Number),
      avgDurationMs: sql<number>`coalesce(avg(${aiProviderAttempts.durationMs}), 0)::float`.mapWith(Number),
      p95DurationMs: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${aiProviderAttempts.durationMs}), 0)::float`.mapWith(Number),
    })
    .from(aiProviderAttempts)
    .innerJoin(aiOperations, eq(aiProviderAttempts.operationId, aiOperations.id))
    .where(attWhereClause);

  // 3. Grouped attempts breakdown by status & error code
  const attemptsGrouped = await db
    .select({
      status: aiProviderAttempts.status,
      errorCode: aiProviderAttempts.errorCode,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(aiProviderAttempts)
    .innerJoin(aiOperations, eq(aiProviderAttempts.operationId, aiOperations.id))
    .where(attWhereClause)
    .groupBy(aiProviderAttempts.status, aiProviderAttempts.errorCode);

  const attemptsByStatus: {
    SUCCESS: number;
    ERROR: number;
    TIMEOUT: number;
    REFUSAL: number;
    [key: string]: number;
  } = {
    SUCCESS: 0,
    ERROR: 0,
    TIMEOUT: 0,
    REFUSAL: 0,
  };

  const attemptsByErrorCode: Record<AiGatewayErrorCode, number> = {
    RATE_LIMIT_EXCEEDED: 0,
    PROVIDER_TIMEOUT: 0,
    PROVIDER_SERVER_ERROR: 0,
    NETWORK_ERROR: 0,
    INVALID_OUTPUT_SYNTAX: 0,
    INVALID_OUTPUT_SEMANTICS: 0,
    CONTEXT_LIMIT_EXCEEDED: 0,
    PROVIDER_REFUSAL: 0,
    AUTHENTICATION_ERROR: 0,
    STALE_SNAPSHOT: 0,
    PROFILE_NOT_FOUND: 0,
    CIRCUIT_OPEN: 0,
  };

  let validationFailureCount = 0;
  let timeoutCount = 0;
  let refusalCount = 0;
  let contextOverflowCount = 0;
  let staleSnapshotCount = 0;

  for (const row of attemptsGrouped) {
    if (row.status) {
      attemptsByStatus[row.status] = (attemptsByStatus[row.status] ?? 0) + row.count;
    }
    if (row.errorCode && row.errorCode in attemptsByErrorCode) {
      const code = row.errorCode as AiGatewayErrorCode;
      attemptsByErrorCode[code] = (attemptsByErrorCode[code] ?? 0) + row.count;
    }
  }

  // Account for special error categories from attempts
  validationFailureCount =
    attemptsByErrorCode.INVALID_OUTPUT_SYNTAX + attemptsByErrorCode.INVALID_OUTPUT_SEMANTICS;
  timeoutCount = Math.max(attemptsByErrorCode.PROVIDER_TIMEOUT, attemptsByStatus.TIMEOUT ?? 0);
  refusalCount = Math.max(attemptsByErrorCode.PROVIDER_REFUSAL, attemptsByStatus.REFUSAL ?? 0);
  contextOverflowCount = attemptsByErrorCode.CONTEXT_LIMIT_EXCEEDED;
  staleSnapshotCount = attemptsByErrorCode.STALE_SNAPSHOT;

  // If an operation was marked STALE or FAILED_EXPLICIT without provider attempts (e.g. pre-invocation context overflow or CAS conflict)
  const staleOps = operationsByStatus.STALE ?? 0;
  if (staleOps > staleSnapshotCount) {
    staleSnapshotCount = staleOps;
  }

  return {
    totalOperations,
    operationsByType: operationsByType as {
      SEMANTIC_RELEVANCE: number;
      TOPIC_MATCHING: number;
      TOPIC_DERIVED_PROJECTION: number;
      [key: string]: number;
    },
    operationsByStatus: operationsByStatus as {
      COMPLETED_RELEVANT: number;
      COMPLETED_IRRELEVANT: number;
      COMPLETED_MATCHED: number;
      COMPLETED_NEW_TOPIC: number;
      COMPLETED: number;
      FAILED_EXPLICIT: number;
      STALE: number;
      [key: string]: number;
    },
    totalAttempts: statsResult?.totalAttempts ?? 0,
    attemptsByStatus,
    attemptsByErrorCode,
    staleSnapshotCount,
    contextOverflowCount,
    refusalCount,
    timeoutCount,
    validationFailureCount,
    totalInputTokens: statsResult?.totalInputTokens ?? 0,
    totalOutputTokens: statsResult?.totalOutputTokens ?? 0,
    totalCachedTokens: statsResult?.totalCachedTokens ?? 0,
    totalEstimatedCostUsd: statsResult?.totalEstimatedCostUsd ?? 0,
    avgDurationMs: Math.round((statsResult?.avgDurationMs ?? 0) * 100) / 100,
    p95DurationMs: Math.round((statsResult?.p95DurationMs ?? 0) * 100) / 100,
  };
}
