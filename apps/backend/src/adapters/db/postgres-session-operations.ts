import type { Pool } from "pg";

import type { ActorContext } from "../../modules/auth/ports.js";

type ActorRow = Readonly<{
  account_id: string;
  role: "PRODUCT_OWNER";
  username: string;
}>;

const assertActorRow = (value: unknown): ActorRow => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("account_id" in value) ||
    typeof value.account_id !== "string" ||
    !("role" in value) ||
    value.role !== "PRODUCT_OWNER" ||
    !("username" in value) ||
    typeof value.username !== "string"
  ) {
    throw new TypeError("PostgreSQL returned an invalid session actor row.");
  }

  return {
    account_id: value.account_id,
    role: value.role,
    username: value.username,
  };
};

const toActorContext = (row: ActorRow): ActorContext => ({
  accountId: row.account_id,
  role: row.role,
  username: row.username,
});

export const commitAuthenticatedSession = async (
  pool: Pool,
  input: Readonly<{
    accountId: string;
    expectedCredentialVersion: number;
    requestId: string | null;
    tokenHash: string;
  }>,
): Promise<ActorContext | null> => {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const current = await client.query(`
      select id as account_id, username, credential_version, role
      from auth_accounts
      where id = $1 and role = 'PRODUCT_OWNER'
      for update
    `, [input.accountId]);
    const value = current.rows[0];
    if (value === undefined) {
      await client.query("commit");
      return null;
    }
    const row = assertActorRow(value);
    if (
      typeof value !== "object" ||
      value === null ||
      !("credential_version" in value) ||
      value.credential_version !== input.expectedCredentialVersion
    ) {
      await client.query("commit");
      return null;
    }

    await client.query(`
      insert into auth_sessions
        (account_id, token_hash, last_activity_at, absolute_expires_at)
      values ($1, $2, current_timestamp, current_timestamp + interval '24 hours')
    `, [row.account_id, input.tokenHash]);
    await client.query(`
      insert into audit_events
        (event_type, outcome, actor_account_id, request_id)
      values ('AUTH_LOGIN_SUCCEEDED', 'SUCCEEDED', $1, $2)
    `, [row.account_id, input.requestId]);
    await client.query("commit");

    return toActorContext(row);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

export const findSessionActor = async (
  pool: Pool,
  tokenHash: string,
): Promise<ActorContext | null> => {
  const result = await pool.query(`
    select a.id as account_id, a.username, a.role
    from auth_sessions s
    join auth_accounts a on a.id = s.account_id
    where s.token_hash = $1
      and s.revoked_at is null
      and s.last_activity_at > clock_timestamp() - interval '12 hours'
      and s.absolute_expires_at > clock_timestamp()
      and a.role = 'PRODUCT_OWNER'
  `, [tokenHash]);
  const value = result.rows[0];

  return value === undefined ? null : toActorContext(assertActorRow(value));
};

export const acknowledgeSessionActivity = async (
  pool: Pool,
  tokenHash: string,
): Promise<boolean> => {
  const result = await pool.query(`
    update auth_sessions
    set last_activity_at = clock_timestamp()
    where token_hash = $1
      and revoked_at is null
      and last_activity_at > clock_timestamp() - interval '12 hours'
      and absolute_expires_at > clock_timestamp()
    returning id
  `, [tokenHash]);

  return result.rowCount === 1;
};

export const signOutSession = async (
  pool: Pool,
  input: Readonly<{ requestId: string | null; tokenHash: string }>,
): Promise<boolean> => {
  const result = await pool.query(`
    with revoked as (
      update auth_sessions
      set revoked_at = clock_timestamp()
      where token_hash = $1
        and revoked_at is null
        and last_activity_at > clock_timestamp() - interval '12 hours'
        and absolute_expires_at > clock_timestamp()
      returning account_id
    )
    insert into audit_events
      (event_type, outcome, actor_account_id, request_id)
    select 'AUTH_SIGN_OUT', 'SUCCEEDED', account_id, $2 from revoked
    returning id
  `, [input.tokenHash, input.requestId]);

  return result.rowCount === 1;
};

export const revokeSession = async (
  pool: Pool,
  tokenHash: string,
): Promise<boolean> => {
  const result = await pool.query(`
    with revoked as (
      update auth_sessions
      set revoked_at = clock_timestamp()
      where token_hash = $1 and revoked_at is null
      returning account_id
    )
    insert into audit_events (event_type, outcome, actor_account_id)
    select 'AUTH_SESSION_REVOKED', 'SUCCEEDED', account_id from revoked
    returning id
  `, [tokenHash]);

  return result.rowCount === 1;
};
