import {
  AuditEvent,
  AuditHistoryQuery,
  KeysetPage,
  AuditKeysetCursorPayload,
  ALLOWED_METADATA_SEARCH_KEYS,
  decodeKeysetCursor,
  encodeKeysetCursor,
  AuditActorRole,
} from '@mahalla-ovozi/api-contracts';
import { and, or, eq, isNull, gte, lte, ilike, desc, asc, sql, SQL } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import { auditEvents, districts } from '../../adapters/db/schema/index.js';
import { getTashkentDayBounds } from '../telegram-intake/timezone-util.js';
import {
  classifyAuditActionCategory,
  determineAuditActionOutcome,
  sanitizeMetadata,
} from './audit-service.js';

export class InvalidCursorError extends Error {
  statusCode = 400;
  code = 'INVALID_CURSOR';
  constructor(message = 'Яроқсиз саҳифалаш курсори.') {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

/**
 * Safely escapes PostgreSQL ILIKE wildcard characters (%, _, \).
 */
export function escapeIlikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export class AuditQueryService {
  /**
   * Queries audit events with multi-parameter filtering, allowlisted ILIKE search,
   * Tashkent timezone calendar day conversion, and deterministic keyset pagination.
   */
  async queryAuditEvents(
    db: DbClient,
    params: AuditHistoryQuery,
  ): Promise<KeysetPage<AuditEvent>> {
    const conditions: (SQL | undefined)[] = [];

    // 1. Keyset Cursor Validation & Condition
    const direction = params.direction || 'forward';
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;

    if (params.cursor) {
      const decoded = decodeKeysetCursor<AuditKeysetCursorPayload>(params.cursor);
      if (
        !decoded ||
        typeof decoded.id !== 'string' ||
        !decoded.createdAt ||
        Number.isNaN(new Date(decoded.createdAt).getTime())
      ) {
        throw new InvalidCursorError();
      }
      cursorDate = new Date(decoded.createdAt);
      cursorId = decoded.id;

      if (direction === 'forward') {
        conditions.push(
          sql`(${auditEvents.createdAt}, ${auditEvents.id}) < (${cursorDate}, ${cursorId})`,
        );
      } else {
        conditions.push(
          sql`(${auditEvents.createdAt}, ${auditEvents.id}) > (${cursorDate}, ${cursorId})`,
        );
      }
    }

    // 2. District Scope Filter (UUID, 'global', or omitted)
    if (params.districtId) {
      if (params.districtId.toLowerCase() === 'global') {
        conditions.push(isNull(auditEvents.districtId));
      } else {
        conditions.push(eq(auditEvents.districtId, params.districtId));
      }
    }

    // 3. Date Range Filter in Asia/Tashkent
    if (params.startDate) {
      const { startUtc } = getTashkentDayBounds(params.startDate);
      conditions.push(gte(auditEvents.createdAt, startUtc));
    }

    if (params.endDate) {
      const { endUtc } = getTashkentDayBounds(params.endDate);
      conditions.push(lte(auditEvents.createdAt, endUtc));
    }

    // 4. Action Category Filter
    if (params.category) {
      switch (params.category) {
        case 'AUTH_SECURITY':
          conditions.push(
            sql`(${auditEvents.action} LIKE 'AUTH_%' OR ${auditEvents.action} IN ('ACCOUNT_PO_CREATED', 'ACCOUNT_PO_PASSWORD_RESET', 'ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED'))`,
          );
          break;
        case 'DISTRICT_ADMINISTRATION':
          conditions.push(
            sql`(${auditEvents.action} LIKE 'DISTRICT_%' AND ${auditEvents.action} NOT LIKE 'DISTRICT_TELEGRAM_BOT_%' AND ${auditEvents.action} NOT LIKE 'DISTRICT_GROUP_%')`,
          );
          break;
        case 'HOKIM_MANAGEMENT':
          conditions.push(
            sql`(${auditEvents.action} LIKE 'ACCOUNT_HOKIM_%' AND ${auditEvents.action} != 'ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED')`,
          );
          break;
        case 'TELEGRAM_INTEGRATION':
          conditions.push(
            sql`(${auditEvents.action} LIKE 'DISTRICT_TELEGRAM_BOT_%' OR ${auditEvents.action} LIKE 'DISTRICT_GROUP_%')`,
          );
          break;
        case 'OPERATIONAL_LIFECYCLE':
          conditions.push(sql`(${auditEvents.action} LIKE 'OPERATIONAL_%')`);
          break;
      }
    }

    // 5. Actor Role Filter
    if (params.actorRole) {
      conditions.push(eq(auditEvents.actorRole, params.actorRole));
    }

    // 6. Action Name Filter
    if (params.action) {
      conditions.push(eq(auditEvents.action, params.action));
    }

    // 7. Outcome Filter
    if (params.outcome) {
      const failureCondition = sql`(${auditEvents.metadata}->>'outcome' = 'FAILURE' OR ${auditEvents.metadata}->>'status' = 'FAILED' OR ${auditEvents.metadata}->>'success' = 'false' OR ${auditEvents.action} LIKE '%_FAILED' OR ${auditEvents.action} LIKE '%_FAILURE')`;
      if (params.outcome === 'FAILURE') {
        conditions.push(failureCondition);
      } else if (params.outcome === 'SUCCESS') {
        conditions.push(sql`NOT (${failureCondition})`);
      }
    }

    // 8. Safe Metadata & Allowlisted Free-text Search
    if (params.search && params.search.trim().length > 0) {
      const escaped = escapeIlikePattern(params.search.trim());
      const pattern = `%${escaped}%`;

      const searchOrs: SQL[] = [
        ilike(auditEvents.id, pattern),
        ilike(auditEvents.action, pattern),
        sql`COALESCE(${auditEvents.actorId}, '') ILIKE ${pattern}`,
        sql`COALESCE(${auditEvents.districtId}, '') ILIKE ${pattern}`,
      ];

      for (const key of ALLOWED_METADATA_SEARCH_KEYS) {
        searchOrs.push(sql`${auditEvents.metadata}->>${key} ILIKE ${pattern}`);
      }

      conditions.push(or(...searchOrs));
    }

    // 9. Query Execution with limit + 1
    const limit = params.limit || 50;
    const filterWhere = conditions.length > 0 ? and(...conditions) : undefined;

    const queryBuilder = db
      .select({
        id: auditEvents.id,
        districtId: auditEvents.districtId,
        districtName: districts.name,
        actorId: auditEvents.actorId,
        actorRole: auditEvents.actorRole,
        action: auditEvents.action,
        ipAddress: auditEvents.ipAddress,
        userAgent: auditEvents.userAgent,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .leftJoin(districts, eq(auditEvents.districtId, districts.id))
      .where(filterWhere);

    if (direction === 'backward') {
      queryBuilder.orderBy(asc(auditEvents.createdAt), asc(auditEvents.id));
    } else {
      queryBuilder.orderBy(desc(auditEvents.createdAt), desc(auditEvents.id));
    }

    queryBuilder.limit(limit + 1);

    const rows = await queryBuilder;

    // 10. Keyset Pagination computation
    const hasMore = rows.length > limit;
    let pageRows = hasMore ? rows.slice(0, limit) : rows;

    if (direction === 'backward') {
      pageRows = pageRows.reverse();
    }

    let hasNextPage = false;
    let hasPrevPage = false;

    if (direction === 'forward') {
      hasNextPage = hasMore;
      hasPrevPage = Boolean(params.cursor);
    } else {
      hasPrevPage = hasMore;
      hasNextPage = true;
    }

    const items: AuditEvent[] = pageRows.map((row) => {
      const rawMeta = row.metadata as Record<string, unknown> | null;
      const sanitizedMeta = sanitizeMetadata(rawMeta || undefined);

      const previousValues = (rawMeta?.previousState ||
        rawMeta?.previousValues ||
        null) as Record<string, unknown> | null;
      const newValues = (rawMeta?.newState ||
        rawMeta?.newValues ||
        null) as Record<string, unknown> | null;
      const reason =
        typeof rawMeta?.reason === 'string' ? rawMeta.reason : null;

      const actorRole: AuditActorRole | null =
        row.actorRole === 'PRODUCT_OWNER' ||
        row.actorRole === 'DISTRICT_HOKIM' ||
        row.actorRole === 'SYSTEM'
          ? row.actorRole
          : null;

      return {
        id: row.id,
        districtId: row.districtId,
        districtName: row.districtName || null,
        actorId: row.actorId,
        actorRole,
        action: row.action,
        category: classifyAuditActionCategory(row.action),
        outcome: determineAuditActionOutcome(row.action, rawMeta || undefined),
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        reason,
        previousValues: previousValues ? sanitizeMetadata(previousValues) || null : null,
        newValues: newValues ? sanitizeMetadata(newValues) || null : null,
        metadata: sanitizedMeta || null,
        createdAt: row.createdAt.toISOString(),
      };
    });

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        nextCursor = encodeKeysetCursor<AuditKeysetCursorPayload>({
          id: lastItem.id,
          createdAt: lastItem.createdAt,
        });
      }
    }

    if (hasPrevPage && items.length > 0) {
      const firstItem = items[0];
      if (firstItem) {
        prevCursor = encodeKeysetCursor<AuditKeysetCursorPayload>({
          id: firstItem.id,
          createdAt: firstItem.createdAt,
        });
      }
    }

    return {
      items,
      pagination: {
        limit,
        hasNextPage,
        hasPrevPage,
        nextCursor,
        prevCursor,
      },
    };
  }

  /**
   * Retrieves a single audit event by ID with joined district name and sanitized metadata.
   */
  async getAuditEventById(
    db: DbClient,
    id: string,
  ): Promise<AuditEvent | null> {
    const rows = await db
      .select({
        id: auditEvents.id,
        districtId: auditEvents.districtId,
        districtName: districts.name,
        actorId: auditEvents.actorId,
        actorRole: auditEvents.actorRole,
        action: auditEvents.action,
        ipAddress: auditEvents.ipAddress,
        userAgent: auditEvents.userAgent,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .leftJoin(districts, eq(auditEvents.districtId, districts.id))
      .where(eq(auditEvents.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    const rawMeta = row.metadata as Record<string, unknown> | null;
    const sanitizedMeta = sanitizeMetadata(rawMeta || undefined);

    const previousValues = (rawMeta?.previousState ||
      rawMeta?.previousValues ||
      null) as Record<string, unknown> | null;
    const newValues = (rawMeta?.newState ||
      rawMeta?.newValues ||
      null) as Record<string, unknown> | null;
    const reason =
      typeof rawMeta?.reason === 'string' ? rawMeta.reason : null;

    const actorRole: AuditActorRole | null =
      row.actorRole === 'PRODUCT_OWNER' ||
      row.actorRole === 'DISTRICT_HOKIM' ||
      row.actorRole === 'SYSTEM'
        ? row.actorRole
        : null;

    return {
      id: row.id,
      districtId: row.districtId,
      districtName: row.districtName || null,
      actorId: row.actorId,
      actorRole,
      action: row.action,
      category: classifyAuditActionCategory(row.action),
      outcome: determineAuditActionOutcome(row.action, rawMeta || undefined),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      reason,
      previousValues: previousValues ? sanitizeMetadata(previousValues) || null : null,
      newValues: newValues ? sanitizeMetadata(newValues) || null : null,
      metadata: sanitizedMeta || null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export const auditQueryService = new AuditQueryService();
