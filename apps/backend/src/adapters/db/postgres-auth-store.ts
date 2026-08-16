import type { Pool, PoolClient } from "pg";

import type {
  AuthStore,
  CredentialSnapshot,
  ProductOwnerProvisionResult,
} from "../../modules/auth/ports.js";
import {
  acknowledgeSessionActivity,
  commitAuthenticatedSession,
  findSessionActor,
  revokeSession,
  signOutSession,
} from "./postgres-session-operations.js";

type ProductOwnerRow = Readonly<{
  credential_version: number;
  id: string;
  username: string;
}>;

type CredentialRow = ProductOwnerRow &
  Readonly<{
    password_hash: string;
    role: "PRODUCT_OWNER";
  }>;

const assertProductOwnerRow = (value: unknown): ProductOwnerRow => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("credential_version" in value) ||
    typeof value.credential_version !== "number" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("username" in value) ||
    typeof value.username !== "string"
  ) {
    throw new TypeError("PostgreSQL returned an invalid Product Owner row.");
  }

  return {
    credential_version: value.credential_version,
    id: value.id,
    username: value.username,
  };
};

const assertCredentialRow = (value: unknown): CredentialRow => {
  const account = assertProductOwnerRow(value);
  if (
    typeof value !== "object" ||
    value === null ||
    !("password_hash" in value) ||
    typeof value.password_hash !== "string" ||
    !("role" in value) ||
    value.role !== "PRODUCT_OWNER"
  ) {
    throw new TypeError("PostgreSQL returned an invalid credential row.");
  }

  return {
    ...account,
    password_hash: value.password_hash,
    role: value.role,
  };
};

const createProductOwner = async (
  client: PoolClient,
  input: Readonly<{ passwordHash: string; username: string }>,
): Promise<ProductOwnerProvisionResult> => {
  const result = await client.query(`
    insert into auth_accounts (username, password_hash, role)
    values ($1, $2, 'PRODUCT_OWNER')
    returning id, username, credential_version
  `, [input.username, input.passwordHash]);
  const row = assertProductOwnerRow(result.rows[0]);

  return {
    accountId: row.id,
    credentialVersion: row.credential_version,
    operation: "created",
    role: "PRODUCT_OWNER",
    username: row.username,
  };
};

const resetProductOwner = async (
  client: PoolClient,
  accountId: string,
  input: Readonly<{ passwordHash: string; username: string }>,
): Promise<ProductOwnerProvisionResult> => {
  const result = await client.query(`
    update auth_accounts
    set username = $2,
        password_hash = $3,
        credential_version = credential_version + 1,
        updated_at = clock_timestamp()
    where id = $1
    returning id, username, credential_version
  `, [accountId, input.username, input.passwordHash]);
  const row = assertProductOwnerRow(result.rows[0]);

  await client.query(`
    update auth_sessions
    set revoked_at = clock_timestamp()
    where account_id = $1 and revoked_at is null
  `, [accountId]);
  await client.query(`
    insert into audit_events (event_type, outcome, actor_account_id)
    values ('AUTH_CREDENTIAL_RESET', 'SUCCEEDED', $1)
  `, [accountId]);

  return {
    accountId: row.id,
    credentialVersion: row.credential_version,
    operation: "reset",
    role: "PRODUCT_OWNER",
    username: row.username,
  };
};

const createOrResetProductOwner = async (
  pool: Pool,
  input: Readonly<{ passwordHash: string; username: string }>,
): Promise<ProductOwnerProvisionResult> => {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const existing = await client.query(`
      select id, username, credential_version
      from auth_accounts
      where role = 'PRODUCT_OWNER'
      for update
    `);
    const existingRow = existing.rows[0];
    const result =
      existingRow === undefined
        ? await createProductOwner(client, input)
        : await resetProductOwner(
            client,
            assertProductOwnerRow(existingRow).id,
            input,
          );
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

const findCredentialSnapshot = async (
  pool: Pool,
  username: string,
): Promise<CredentialSnapshot | null> => {
  const result = await pool.query(`
    select id, username, password_hash, credential_version, role
    from auth_accounts
    where username = $1 and role = 'PRODUCT_OWNER'
  `, [username]);
  const value = result.rows[0];
  if (value === undefined) {
    return null;
  }
  const row = assertCredentialRow(value);

  return {
    accountId: row.id,
    credentialVersion: row.credential_version,
    passwordHash: row.password_hash,
    role: row.role,
    username: row.username,
  };
};

const appendUnauthenticatedAuditEvent = async (
  pool: Pool,
  input: Readonly<{
    eventType: "AUTH_LOGIN_FAILED" | "AUTH_RATE_LIMITED";
    requestId: string;
  }>,
): Promise<void> => {
  await pool.query(`
    insert into audit_events (event_type, outcome, request_id)
    values ($1, 'FAILED', $2)
  `, [input.eventType, input.requestId]);
};

export const createPostgresAuthStore = (pool: Pool): AuthStore => ({
  acknowledgeSessionActivity: async (tokenHash): Promise<boolean> =>
    acknowledgeSessionActivity(pool, tokenHash),
  appendUnauthenticatedAuditEvent: async (input): Promise<void> =>
    appendUnauthenticatedAuditEvent(pool, input),
  commitAuthenticatedSession: async (input) =>
    commitAuthenticatedSession(pool, input),
  createOrResetProductOwner: async (input): Promise<ProductOwnerProvisionResult> =>
    createOrResetProductOwner(pool, input),
  findCredentialSnapshot: async (username): Promise<CredentialSnapshot | null> =>
    findCredentialSnapshot(pool, username),
  findSessionActor: async (tokenHash) => findSessionActor(pool, tokenHash),
  revokeSession: async (tokenHash): Promise<boolean> =>
    revokeSession(pool, tokenHash),
  signOutSession: async (input): Promise<boolean> =>
    signOutSession(pool, input),
});
