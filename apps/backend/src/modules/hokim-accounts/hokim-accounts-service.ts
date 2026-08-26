import crypto from 'node:crypto';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { DbClient, mapPostgresConstraintError } from '../../adapters/db/client.js';
import { accounts, districts, sessions, Account } from '../../adapters/db/schema/index.js';
import {
  DistrictHokimAccount,
  HokimAccountStateEnum,
  HokimAccountStatus,
} from '@mahalla-ovozi/api-contracts';
import { cryptoService } from '../../adapters/crypto/index.js';
import { recordAuditEvent } from '../audit/audit-service.js';
import { DistrictNotFoundError } from '../districts/districts-service.js';

export class DistrictHokimAlreadyExistsError extends Error {
  statusCode = 409;
  code = 'DISTRICT_HOKIM_ALREADY_EXISTS';
  constructor(districtId: string) {
    super(`Ушбу туманда аллақачон фаол ҳоким аккаунти мавжуд (ID: ${districtId}).`);
  }
}

export class HokimAccountNotFoundError extends Error {
  statusCode = 404;
  code = 'HOKIM_ACCOUNT_NOT_FOUND';
  constructor(districtId: string) {
    super(`Туманда ҳоким аккаунти топилмади (ID: ${districtId}).`);
  }
}

export class UsernameAlreadyTakenError extends Error {
  statusCode = 409;
  code = 'USERNAME_ALREADY_EXISTS';
  constructor(username: string) {
    super(`Ушбу фойдаланувчи номи (${username}) аллақачон банд.`);
  }
}

export class HokimAccountDisabledError extends Error {
  statusCode = 400;
  code = 'HOKIM_ACCOUNT_DISABLED';
  constructor(districtId: string) {
    super(`Ҳоким аккаунти фаол эмас (ID: ${districtId}).`);
  }
}

export interface ClientContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ActorContext {
  id: string;
  role: string;
}

export function toDistrictHokimAccount(account: Account): DistrictHokimAccount {
  return {
    id: account.id,
    username: account.username,
    role: 'DISTRICT_HOKIM',
    status: account.status as HokimAccountStatus,
    districtId: account.districtId!,
    credentialVersion: account.credentialVersion,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

/**
 * Retrieves the current Hokim account state for a given District.
 * Checks for an active Hokim account first; if none, falls back to the most recent disabled account.
 */
export async function getDistrictHokimAccount(
  db: DbClient,
  districtId: string,
): Promise<{ state: HokimAccountStateEnum; account: DistrictHokimAccount | null }> {
  // Validate district exists
  const [district] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  // 1. Look for active Hokim account
  const [activeAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.districtId, districtId),
        eq(accounts.role, 'DISTRICT_HOKIM'),
        eq(accounts.status, 'ACTIVE'),
      ),
    )
    .limit(1);

  if (activeAccount) {
    return {
      state: 'ACTIVE',
      account: toDistrictHokimAccount(activeAccount),
    };
  }

  // 2. Look for most recent disabled Hokim account
  const [disabledAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.districtId, districtId),
        eq(accounts.role, 'DISTRICT_HOKIM'),
        eq(accounts.status, 'DISABLED'),
      ),
    )
    .orderBy(desc(accounts.updatedAt))
    .limit(1);

  if (disabledAccount) {
    return {
      state: 'DISABLED',
      account: toDistrictHokimAccount(disabledAccount),
    };
  }

  return {
    state: 'NO_ACCOUNT',
    account: null,
  };
}

/**
 * Creates a new active Hokim account for a District and generates an ephemeral temporary password.
 */
export async function createDistrictHokimAccount(
  db: DbClient,
  districtId: string,
  params: { username: string },
  actor: ActorContext,
  clientInfo?: ClientContext,
): Promise<{ account: DistrictHokimAccount; temporaryPassword: string }> {
  // 1. Verify district exists
  const [district] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  const normalizedUsername = params.username.trim();

  // 2. Pre-transaction checks (AD-1)
  const [existingUsername] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.username, normalizedUsername))
    .limit(1);

  if (existingUsername) {
    throw new UsernameAlreadyTakenError(normalizedUsername);
  }

  const [existingActiveHokim] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.districtId, districtId),
        eq(accounts.role, 'DISTRICT_HOKIM'),
        eq(accounts.status, 'ACTIVE'),
      ),
    )
    .limit(1);

  if (existingActiveHokim) {
    throw new DistrictHokimAlreadyExistsError(districtId);
  }

  // 3. Generate cryptographic temporary password & Argon2id hash
  const temporaryPassword = cryptoService.passwords.generateTemporary(18);
  const passwordHash = await cryptoService.passwords.hash(temporaryPassword);
  const accountId = `acc_${crypto.randomUUID()}`;
  const now = new Date();

  // 4. Atomic database creation & privacy-safe audit logging
  try {
    const createdAccount = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(accounts)
        .values({
          id: accountId,
          username: normalizedUsername,
          passwordHash,
          role: 'DISTRICT_HOKIM',
          status: 'ACTIVE',
          districtId,
          mustChangePassword: true,
          credentialVersion: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to create Hokim account');
      }

      await recordAuditEvent(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        districtId,
        action: 'ACCOUNT_HOKIM_CREATED',
        ipAddress: clientInfo?.ipAddress ?? null,
        userAgent: clientInfo?.userAgent ?? null,
        metadata: {
          districtId,
          districtName: district.name,
          createdAccountId: accountId,
          username: normalizedUsername,
        },
      });

      return inserted;
    });

    return {
      account: toDistrictHokimAccount(createdAccount),
      temporaryPassword,
    };
  } catch (err: unknown) {
    if (
      err instanceof DistrictHokimAlreadyExistsError ||
      err instanceof UsernameAlreadyTakenError
    ) {
      throw err;
    }
    mapPostgresConstraintError(
      err,
      {
        accounts_active_district_hokim_idx: () => new DistrictHokimAlreadyExistsError(districtId),
        district: () => new DistrictHokimAlreadyExistsError(districtId),
        username: () => new UsernameAlreadyTakenError(normalizedUsername),
      },
      () => new UsernameAlreadyTakenError(normalizedUsername),
    );
    throw err;
  }
}

/**
 * Resets the credentials of an existing active Hokim account.
 * Generates a new temporary password, increments credentialVersion,
 * and immediately revokes all active sessions.
 */
export async function resetDistrictHokimPassword(
  db: DbClient,
  districtId: string,
  actor: ActorContext,
  clientInfo?: ClientContext,
): Promise<{ account: DistrictHokimAccount; temporaryPassword: string }> {
  // 1. Verify district exists
  const [district] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  // 2. Find active Hokim account
  const [activeAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.districtId, districtId),
        eq(accounts.role, 'DISTRICT_HOKIM'),
        eq(accounts.status, 'ACTIVE'),
      ),
    )
    .limit(1);

  if (!activeAccount) {
    throw new HokimAccountNotFoundError(districtId);
  }

  // 3. Generate new temporary password & hash
  const temporaryPassword = cryptoService.passwords.generateTemporary(18);
  const passwordHash = await cryptoService.passwords.hash(temporaryPassword);
  const now = new Date();

  // 4. Atomic update + session revocation + audit event
  const updatedAccount = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(accounts)
      .set({
        passwordHash,
        mustChangePassword: true,
        credentialVersion: activeAccount.credentialVersion + 1,
        updatedAt: now,
      })
      .where(eq(accounts.id, activeAccount.id))
      .returning();

    if (!updated) {
      throw new HokimAccountNotFoundError(districtId);
    }

    // Revoke all active sessions immediately
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.accountId, activeAccount.id), isNull(sessions.revokedAt)));

    await recordAuditEvent(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      districtId,
      action: 'ACCOUNT_HOKIM_PASSWORD_RESET',
      ipAddress: clientInfo?.ipAddress ?? null,
      userAgent: clientInfo?.userAgent ?? null,
      metadata: {
        districtId,
        districtName: district.name,
        accountId: activeAccount.id,
        username: activeAccount.username,
        newCredentialVersion: updated.credentialVersion,
      },
    });

    return updated;
  });

  return {
    account: toDistrictHokimAccount(updatedAccount),
    temporaryPassword,
  };
}

/**
 * Disables an active Hokim account and revokes all active sessions.
 */
export async function disableDistrictHokimAccount(
  db: DbClient,
  districtId: string,
  actor: ActorContext,
  clientInfo?: ClientContext,
): Promise<{ account: DistrictHokimAccount }> {
  const [district] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  const [activeAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.districtId, districtId),
        eq(accounts.role, 'DISTRICT_HOKIM'),
        eq(accounts.status, 'ACTIVE'),
      ),
    )
    .limit(1);

  if (!activeAccount) {
    throw new HokimAccountNotFoundError(districtId);
  }

  const now = new Date();

  const disabledAccount = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(accounts)
      .set({
        status: 'DISABLED',
        credentialVersion: activeAccount.credentialVersion + 1,
        updatedAt: now,
      })
      .where(eq(accounts.id, activeAccount.id))
      .returning();

    if (!updated) {
      throw new HokimAccountNotFoundError(districtId);
    }

    // Revoke all active sessions immediately
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.accountId, activeAccount.id), isNull(sessions.revokedAt)));

    await recordAuditEvent(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      districtId,
      action: 'ACCOUNT_HOKIM_DISABLED',
      ipAddress: clientInfo?.ipAddress ?? null,
      userAgent: clientInfo?.userAgent ?? null,
      metadata: {
        districtId,
        districtName: district.name,
        accountId: activeAccount.id,
        username: activeAccount.username,
      },
    });

    return updated;
  });

  return {
    account: toDistrictHokimAccount(disabledAccount),
  };
}

/**
 * Replaces the Hokim account for a District with a new username.
 * Disables any existing active account, creates the new account,
 * and generates fresh credentials.
 */
export async function replaceDistrictHokimAccount(
  db: DbClient,
  districtId: string,
  params: { newUsername: string },
  actor: ActorContext,
  clientInfo?: ClientContext,
): Promise<{ account: DistrictHokimAccount; temporaryPassword: string; previousAccountId: string }> {
  const [district] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  const normalizedUsername = params.newUsername.trim();

  // Pre-transaction duplicate username check (AD-1)
  const [existingUsername] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.username, normalizedUsername))
    .limit(1);

  if (existingUsername) {
    throw new UsernameAlreadyTakenError(normalizedUsername);
  }

  // Generate credentials for the new account
  const temporaryPassword = cryptoService.passwords.generateTemporary(18);
  const passwordHash = await cryptoService.passwords.hash(temporaryPassword);
  const newAccountId = `acc_${crypto.randomUUID()}`;
  const now = new Date();

  // Atomic transition in a single transaction
  try {
    let resolvedPreviousAccountId: string | undefined;

    const createdAccount = await db.transaction(async (tx) => {
      // Find active Hokim account within transaction
      const [currentActive] = await tx
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.districtId, districtId),
            eq(accounts.role, 'DISTRICT_HOKIM'),
            eq(accounts.status, 'ACTIVE'),
          ),
        )
        .limit(1);

      if (currentActive) {
        resolvedPreviousAccountId = currentActive.id;
        await tx
          .update(accounts)
          .set({
            status: 'DISABLED',
            credentialVersion: currentActive.credentialVersion + 1,
            updatedAt: now,
          })
          .where(eq(accounts.id, currentActive.id));

        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.accountId, currentActive.id), isNull(sessions.revokedAt)));
      } else {
        const [latestDisabled] = await tx
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.districtId, districtId),
              eq(accounts.role, 'DISTRICT_HOKIM'),
            ),
          )
          .orderBy(desc(accounts.updatedAt))
          .limit(1);

        if (!latestDisabled) {
          throw new HokimAccountNotFoundError(districtId);
        }
        resolvedPreviousAccountId = latestDisabled.id;
      }

      // Insert new active account
      const [inserted] = await tx
        .insert(accounts)
        .values({
          id: newAccountId,
          username: normalizedUsername,
          passwordHash,
          role: 'DISTRICT_HOKIM',
          status: 'ACTIVE',
          districtId,
          mustChangePassword: true,
          credentialVersion: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to insert replacement Hokim account');
      }

      await recordAuditEvent(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        districtId,
        action: 'ACCOUNT_HOKIM_REPLACED',
        ipAddress: clientInfo?.ipAddress ?? null,
        userAgent: clientInfo?.userAgent ?? null,
        metadata: {
          districtId,
          districtName: district.name,
          previousAccountId: resolvedPreviousAccountId,
          newAccountId,
          newUsername: normalizedUsername,
        },
      });

      return inserted;
    });

    return {
      account: toDistrictHokimAccount(createdAccount),
      temporaryPassword,
      previousAccountId: resolvedPreviousAccountId!,
    };
  } catch (err: unknown) {
    if (
      err instanceof DistrictNotFoundError ||
      err instanceof HokimAccountNotFoundError ||
      err instanceof UsernameAlreadyTakenError ||
      err instanceof DistrictHokimAlreadyExistsError
    ) {
      throw err;
    }
    mapPostgresConstraintError(
      err,
      {
        accounts_active_district_hokim_idx: () => new DistrictHokimAlreadyExistsError(districtId),
        district: () => new DistrictHokimAlreadyExistsError(districtId),
        username: () => new UsernameAlreadyTakenError(normalizedUsername),
      },
      () => new UsernameAlreadyTakenError(normalizedUsername),
    );
    throw err;
  }
}
