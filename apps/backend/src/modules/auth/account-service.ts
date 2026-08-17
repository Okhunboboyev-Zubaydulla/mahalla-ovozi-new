import crypto from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import { accounts, sessions, auditEvents } from '../../adapters/db/schema/index.js';
import { validatePassword } from '../../adapters/crypto/password-policy.js';
import { hashPassword } from '../../adapters/crypto/argon2.js';

export interface ManageProductOwnerResult {
  isNew: boolean;
  accountId: string;
  username: string;
  credentialVersion: number;
}

export async function createOrResetProductOwner(
  db: DbClient,
  input: { username: string; password: string }
): Promise<ManageProductOwnerResult> {
  const username = input.username.trim();
  if (!username || username.length < 3 || username.length > 64) {
    throw new Error('Фойдаланувчи номи 3 дан 64 белгигача бўлиши керак.');
  }

  const validation = validatePassword(input.password);
  if (!validation.isValid) {
    throw new Error(validation.message || 'Парол талабга жавоб бермайди.');
  }

  const hashedPassword = await hashPassword(input.password);

  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .limit(1);

  if (existing) {
    const newVersion = existing.credentialVersion + 1;
    const now = new Date();

    // B7: Wrap all mutations in a transaction — prevents partial state
    // (e.g. password updated but sessions not revoked) if the process crashes mid-execution.
    await db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({
          passwordHash: hashedPassword,
          credentialVersion: newVersion,
          updatedAt: now,
        })
        .where(eq(accounts.id, existing.id));

      // Immediately revoke all existing active sessions upon credential reset
      await tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.accountId, existing.id), isNull(sessions.revokedAt)));

      // Record privacy-safe audit event
      await tx.insert(auditEvents).values({
        id: `aud_${crypto.randomUUID()}`,
        actorId: existing.id,
        actorRole: 'PRODUCT_OWNER',
        action: 'ACCOUNT_PO_PASSWORD_RESET',
        metadata: {
          username,
          credential_version: newVersion,
        },
        createdAt: now,
      });
    });

    return {
      isNew: false,
      accountId: existing.id,
      username,
      credentialVersion: newVersion,
    };
  }

  const accountId = `acc_${crypto.randomUUID()}`;
  const now = new Date();

  await db.insert(accounts).values({
    id: accountId,
    username,
    passwordHash: hashedPassword,
    role: 'PRODUCT_OWNER',
    credentialVersion: 1,
    createdAt: now,
    updatedAt: now,
  });

  // Record privacy-safe audit event
  await db.insert(auditEvents).values({
    id: `aud_${crypto.randomUUID()}`,
    actorId: accountId,
    actorRole: 'PRODUCT_OWNER',
    action: 'ACCOUNT_PO_CREATED',
    metadata: {
      username,
      credential_version: 1,
    },
    createdAt: now,
  });

  return {
    isNew: true,
    accountId,
    username,
    credentialVersion: 1,
  };
}
