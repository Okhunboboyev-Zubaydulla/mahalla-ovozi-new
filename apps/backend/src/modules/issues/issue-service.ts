import { eq, and, sql, asc } from 'drizzle-orm';
import {
  IssueSeverity,
  OperationalIssue,
  OperationalIssuesListResponse,
  OperationalIssueDetailResponse,
  IssueAuditEvent,
  IssueCategory,
  IssueStatus,
  ComponentScope,
  ComponentType,
  HealthStatus,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import {
  operationalIssues,
  districts,
  auditEvents,
} from '../../adapters/db/schema/index.js';
import { sortOperationalIssues } from './issue-evaluator.js';

export class OperationalIssueNotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  constructor(message = 'Сўралган техник муаммо топилмади.') {
    super(message);
    this.name = 'OperationalIssueNotFoundError';
  }
}

export interface GetIssuesOptions {
  districtId?: string;
  status?: 'ACTIVE' | 'RESOLVED';
  severity?: IssueSeverity;
}

function formatOperationalIssue(
  row: typeof operationalIssues.$inferSelect,
  districtName?: string | null,
): OperationalIssue {
  return {
    id: row.id,
    logicalKey: row.logicalKey,
    scope: row.scope as ComponentScope,
    districtId: row.districtId,
    districtName: districtName || null,
    component: row.component as ComponentType,
    issueCategory: row.issueCategory as IssueCategory,
    severity: row.severity as IssueSeverity,
    status: row.status as IssueStatus,
    healthStatus: row.healthStatus as HealthStatus,
    sanitizedTitle: row.sanitizedTitle,
    sanitizedDescription: row.sanitizedDescription,
    recommendedAction: row.recommendedAction,
    targetRoute: row.targetRoute,
    startedAt: row.startedAt.toISOString(),
    latestCheckAt: row.latestCheckAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    metadata: row.metadata,
  };
}

export const issueService = {
  /**
   * Fetches operational issues with optional filtering by district, status, and severity (Story 4.2 AC 1, AC 4).
   */
  async getOperationalIssues(
    db: DbClient,
    options: GetIssuesOptions = {},
  ): Promise<OperationalIssuesListResponse> {
    const evaluatedAt = new Date().toISOString();

    const conditions = [];

    if (options.districtId) {
      conditions.push(eq(operationalIssues.districtId, options.districtId));
    }
    if (options.status) {
      conditions.push(eq(operationalIssues.status, options.status));
    }
    if (options.severity) {
      conditions.push(eq(operationalIssues.severity, options.severity));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        issue: operationalIssues,
        districtName: districts.name,
      })
      .from(operationalIssues)
      .leftJoin(districts, eq(operationalIssues.districtId, districts.id))
      .where(whereClause);

    const formattedIssues = rows.map((r) =>
      formatOperationalIssue(r.issue, r.districtName),
    );
    const sortedIssues = sortOperationalIssues(formattedIssues);

    // Compute active counts
    const activeConditions = [eq(operationalIssues.status, 'ACTIVE')];
    if (options.districtId) {
      activeConditions.push(eq(operationalIssues.districtId, options.districtId));
    }

    const activeRows = await db
      .select({
        severity: operationalIssues.severity,
      })
      .from(operationalIssues)
      .where(and(...activeConditions));

    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const r of activeRows) {
      if (r.severity === 'Critical') criticalCount++;
      else if (r.severity === 'Warning') warningCount++;
      else if (r.severity === 'Information') infoCount++;
    }

    return {
      issues: sortedIssues,
      totalActive: activeRows.length,
      criticalCount,
      warningCount,
      infoCount,
      evaluatedAt,
    };
  },

  /**
   * Fetches operational issue detail along with its audit events history (Story 4.2 AC 5, AC 10, AC 11, AC 13).
   */
  async getOperationalIssueDetail(
    db: DbClient,
    issueId: string,
  ): Promise<OperationalIssueDetailResponse> {
    const [row] = await db
      .select({
        issue: operationalIssues,
        districtName: districts.name,
      })
      .from(operationalIssues)
      .leftJoin(districts, eq(operationalIssues.districtId, districts.id))
      .where(eq(operationalIssues.id, issueId))
      .limit(1);

    if (!row) {
      throw new OperationalIssueNotFoundError();
    }

    const issue = formatOperationalIssue(row.issue, row.districtName);

    // Query related audit events by issueId inside JSONB metadata
    const auditRows = await db
      .select()
      .from(auditEvents)
      .where(
        sql`${auditEvents.metadata}->>'issueId' = ${issueId} OR ${auditEvents.metadata}->>'logicalKey' = ${issue.logicalKey}`,
      )
      .orderBy(asc(auditEvents.createdAt));

    const auditEventList: IssueAuditEvent[] = auditRows.map((a) => ({
      id: a.id,
      action: a.action,
      actorId: a.actorId,
      actorRole: a.actorRole,
      createdAt: a.createdAt.toISOString(),
      metadata: a.metadata,
    }));

    return {
      issue,
      auditEvents: auditEventList,
    };
  },
};
