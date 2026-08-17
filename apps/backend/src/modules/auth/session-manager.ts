import crypto from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import { sessions, accounts, Account, Session } from '../../adapters/db/schema/index.js';

export const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;    // 12 hours sliding
export const ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours absolute ceiling
export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || '__Host-session';

export function generateSessionToken(): string {
  // 256 bits of cryptographic entropy
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionValidationResult {
  isValid: boolean;
  account?: Account;
  session?: Session;
  reason?: 'NOT_FOUND' | 'REVOKED' | 'CREDENTIAL_VERSION_MISMATCH' | 'ABSOLUTE_EXPIRY' | 'IDLE_EXPIRY';
}

export async function createSession(
  db: DbClient,
  params: { accountId: string; expectedCredentialVersion: number }
): Promise<{ sessionToken: string; expiresAt: Date; sessionId: string }> {
  // Concurrency check: verify credential_version is still current at commit time
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, params.accountId))
    .limit(1);

  if (!account || account.credentialVersion !== params.expectedCredentialVersion) {
    throw new Error('CREDENTIAL_CONCURRENCY_CONFLICT');
  }

  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const sessionId = `sess_${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IDLE_TIMEOUT_MS);

  await db.insert(sessions).values({
    id: sessionId,
    accountId: params.accountId,
    tokenHash,
    credentialVersion: account.credentialVersion,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
    revokedAt: null,
  });

  return {
    sessionToken,
    expiresAt,
    sessionId,
  };
}

export async function validateAndTouchSession(
  db: DbClient,
  rawToken: string
): Promise<SessionValidationResult> {
  if (!rawToken || typeof rawToken !== 'string') {
    return { isValid: false, reason: 'NOT_FOUND' };
  }

  const tokenHash = hashSessionToken(rawToken);

  const [record] = await db
    .select({
      session: sessions,
      account: accounts,
    })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!record || !record.session || !record.account) {
    return { isValid: false, reason: 'NOT_FOUND' };
  }

  const { session, account } = record;
  const now = new Date();

  // 1. Check if revoked
  if (session.revokedAt) {
    return { isValid: false, reason: 'REVOKED' };
  }

  // 2. Check credential version
  if (session.credentialVersion !== account.credentialVersion) {
    await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, session.id));
    return { isValid: false, reason: 'CREDENTIAL_VERSION_MISMATCH' };
  }

  // 3. Check 24h absolute ceiling
  const sessionAgeMs = now.getTime() - session.createdAt.getTime();
  if (sessionAgeMs >= ABSOLUTE_TIMEOUT_MS) {
    await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, session.id));
    return { isValid: false, reason: 'ABSOLUTE_EXPIRY' };
  }

  // 4. Check 12h sliding idle timeout
  const idleAgeMs = now.getTime() - session.lastActiveAt.getTime();
  if (idleAgeMs >= IDLE_TIMEOUT_MS) {
    await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, session.id));
    return { isValid: false, reason: 'IDLE_EXPIRY' };
  }

  // 5. Valid session: calculate updated sliding expiry
  const maxPossibleExpiry = session.createdAt.getTime() + ABSOLUTE_TIMEOUT_MS;
  const slidingExpiry = now.getTime() + IDLE_TIMEOUT_MS;
  const newExpiresAt = new Date(Math.min(slidingExpiry, maxPossibleExpiry));

  await db
    .update(sessions)
    .set({
      lastActiveAt: now,
      expiresAt: newExpiresAt,
    })
    .where(eq(sessions.id, session.id));

  return {
    isValid: true,
    account,
    session: {
      ...session,
      lastActiveAt: now,
      expiresAt: newExpiresAt,
    },
  };
}

export async function revokeSessionByToken(db: DbClient, rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}
