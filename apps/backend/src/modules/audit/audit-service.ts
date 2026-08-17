import crypto from 'node:crypto';
import { DbClient } from '../../adapters/db/client.js';
import { auditEvents, NewAuditEvent } from '../../adapters/db/schema/index.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'tokenhash',
  'token_hash',
  'cookie',
  'cookies',
  'secret',
  'authorization',
]);

export function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue; // Scrub sensitive fields completely
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export type DbOrTx = DbClient | Parameters<Parameters<DbClient['transaction']>[0]>[0];

export async function recordAuditEvent(
  db: DbOrTx,
  params: {
    actorId?: string | null;
    actorRole?: string | null;
    action: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const event: NewAuditEvent = {
    id: `aud_${crypto.randomUUID()}`,
    actorId: params.actorId || null,
    actorRole: params.actorRole || null,
    action: params.action,
    ipAddress: params.ipAddress || null,
    userAgent: params.userAgent || null,
    metadata: sanitizeMetadata(params.metadata),
    createdAt: new Date(),
  };

  await db.insert(auditEvents).values(event);
}
