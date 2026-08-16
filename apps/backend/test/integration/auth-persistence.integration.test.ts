import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import pg from "pg";

import { createArgon2idPasswordCrypto } from "../../src/adapters/crypto/argon2id-password-crypto.js";
import { createOpaqueSessionCrypto } from "../../src/adapters/crypto/opaque-session-crypto.js";
import { createPostgresAuthStore } from "../../src/adapters/db/postgres-auth-store.js";
import {
  createAuthService,
  InvalidCredentialsError,
} from "../../src/modules/auth/auth-service.js";
import { provisionProductOwner } from "../../src/modules/auth/provision-product-owner.js";

const { Pool } = pg;

const testDatabaseUrl = process.env["TEST_DATABASE_URL"];

if (testDatabaseUrl === undefined) {
  throw new Error("TEST_DATABASE_URL is required for PostgreSQL integration tests.");
}

const pool = new Pool({ connectionString: testDatabaseUrl });
const authStore = createPostgresAuthStore(pool);
const passwordCrypto = createArgon2idPasswordCrypto();
const sessionCrypto = createOpaqueSessionCrypto();
let authService: ReturnType<typeof createAuthService>;

beforeAll(async (): Promise<void> => {
  await pool.query("select 1");
  const dummyPasswordHash = await passwordCrypto.hash(
    "Dummy timing password",
  );
  authService = createAuthService({
    authStore,
    dummyPasswordHash,
    passwordCrypto,
    sessionCrypto,
  });
});

beforeEach(async (): Promise<void> => {
  await pool.query(
    "truncate table audit_events, auth_sessions, auth_accounts restart identity cascade",
  );
});

afterAll(async (): Promise<void> => {
  await pool.end();
});

describe("Story 1.1 Product Owner provisioning and reset", () => {
  test("creates one canonical Product Owner with only an Argon2id hash", async (): Promise<void> => {
    const password = "  Ўта махфий парол  ";

    const result = await provisionProductOwner(
      { password, username: "  O\u0308Owner  " },
      { authStore, passwordCrypto },
    );

    expect(result).toMatchObject({
      credentialVersion: 1,
      operation: "created",
      role: "PRODUCT_OWNER",
      username: "ÖOwner",
    });

    const account = await pool.query<{
      password_hash: string;
      username: string;
    }>("select username, password_hash from auth_accounts");
    expect(account.rows[0]?.username).toBe("ÖOwner");
    expect(account.rows[0]?.password_hash).not.toBe(password);
    expect(account.rows[0]?.password_hash).toMatch(/^\$argon2id\$/);
    await expect(
      passwordCrypto.verify(account.rows[0]?.password_hash ?? "", password),
    ).resolves.toBe(true);

    const counts = await pool.query<{
      audit_count: string;
      district_count: string;
    }>(`
      select
        (select count(*) from audit_events)::text as audit_count,
        (select count(*) from information_schema.tables
          where table_schema = 'public' and table_name = 'districts')::text
          as district_count
    `);
    expect(counts.rows[0]).toEqual({ audit_count: "0", district_count: "0" });
  });

  test("atomically replaces credentials, advances the version, revokes sessions, and audits", async (): Promise<void> => {
    const initial = await provisionProductOwner(
      { password: "First secure password", username: "Owner" },
      { authStore, passwordCrypto },
    );
    await pool.query(
      `insert into auth_sessions
        (account_id, token_hash, last_activity_at, absolute_expires_at)
       values ($1, 'old-token-hash', clock_timestamp(), clock_timestamp() + interval '24 hours')`,
      [initial.accountId],
    );

    const reset = await provisionProductOwner(
      { password: "Second secure password", username: "Owner" },
      { authStore, passwordCrypto },
    );

    expect(reset).toMatchObject({
      accountId: initial.accountId,
      credentialVersion: 2,
      operation: "reset",
    });
    const state = await pool.query<{
      credential_version: number;
      event_type: string;
      password_hash: string;
      revoked_at: Date | null;
    }>(`
      select a.credential_version, a.password_hash, s.revoked_at, e.event_type
      from auth_accounts a
      join auth_sessions s on s.account_id = a.id
      join audit_events e on e.actor_account_id = a.id
    `);
    expect(state.rows[0]?.credential_version).toBe(2);
    expect(state.rows[0]?.revoked_at).toBeInstanceOf(Date);
    expect(state.rows[0]?.event_type).toBe("AUTH_CREDENTIAL_RESET");
    await expect(
      passwordCrypto.verify(
        state.rows[0]?.password_hash ?? "",
        "Second secure password",
      ),
    ).resolves.toBe(true);
  });

  test("rolls back credential and session changes when reset auditing fails", async (): Promise<void> => {
    const initialPassword = "Initial rollback password";
    const account = await provisionProductOwner(
      { password: initialPassword, username: "Owner" },
      { authStore, passwordCrypto },
    );
    await pool.query(
      `insert into auth_sessions
        (account_id, token_hash, last_activity_at, absolute_expires_at)
       values ($1, 'rollback-token-hash', clock_timestamp(), clock_timestamp() + interval '24 hours')`,
      [account.accountId],
    );
    await pool.query(`
      create function fail_credential_reset_audit() returns trigger
      language plpgsql as $$
      begin
        if new.event_type = 'AUTH_CREDENTIAL_RESET' then
          raise exception 'forced reset audit failure';
        end if;
        return new;
      end;
      $$;
      create trigger fail_credential_reset_audit_trigger
      before insert on audit_events
      for each row execute function fail_credential_reset_audit();
    `);

    try {
      await expect(
        provisionProductOwner(
          { password: "Replacement rollback password", username: "Owner" },
          { authStore, passwordCrypto },
        ),
      ).rejects.toThrow("forced reset audit failure");
    } finally {
      await pool.query(`
        drop trigger if exists fail_credential_reset_audit_trigger on audit_events;
        drop function if exists fail_credential_reset_audit();
      `);
    }

    const state = await pool.query<{
      credential_version: number;
      password_hash: string;
      revoked_at: Date | null;
    }>(`
      select a.credential_version, a.password_hash, s.revoked_at
      from auth_accounts a
      join auth_sessions s on s.account_id = a.id
    `);
    expect(state.rows[0]?.credential_version).toBe(1);
    expect(state.rows[0]?.revoked_at).toBeNull();
    await expect(
      passwordCrypto.verify(state.rows[0]?.password_hash ?? "", initialPassword),
    ).resolves.toBe(true);
  });
});

describe("Story 1.1 authentication and opaque session persistence", () => {
  test("rejects wrong and nonexistent credentials without creating sessions", async (): Promise<void> => {
    await provisionProductOwner(
      { password: "Owner secure password", username: "Owner" },
      { authStore, passwordCrypto },
    );

    await expect(
      authService.authenticate({
        password: "Wrong secure password",
        requestId: null,
        username: "Owner",
      }),
    ).rejects.toEqual(new InvalidCredentialsError());
    await expect(
      authService.authenticate({
        password: "Wrong secure password",
        requestId: null,
        username: "MissingOwner",
      }),
    ).rejects.toEqual(new InvalidCredentialsError());

    const sessions = await pool.query<{ count: string }>(
      "select count(*)::text as count from auth_sessions",
    );
    expect(sessions.rows[0]?.count).toBe("0");
  });

  test("creates independent sessions while persisting only token hashes", async (): Promise<void> => {
    const account = await provisionProductOwner(
      { password: "Owner secure password", username: "Owner" },
      { authStore, passwordCrypto },
    );

    const first = await authService.authenticate({
      password: "Owner secure password",
      requestId: null,
      username: "Owner",
    });
    const second = await authService.authenticate({
      password: "Owner secure password",
      requestId: null,
      username: "Owner",
    });

    expect(first.actor).toEqual({
      accountId: account.accountId,
      role: "PRODUCT_OWNER",
      username: "Owner",
    });
    expect(first.token).not.toBe(second.token);

    const sessions = await pool.query<{
      absolute_hours: number;
      token_hash: string;
    }>(`
      select token_hash,
        extract(epoch from (absolute_expires_at - created_at)) / 3600
          as absolute_hours
      from auth_sessions
      order by created_at
    `);
    expect(sessions.rows).toHaveLength(2);
    expect(sessions.rows.map((row) => row.token_hash)).toEqual([
      sessionCrypto.hash(first.token),
      sessionCrypto.hash(second.token),
    ]);
    expect(sessions.rows[0]?.token_hash).not.toBe(first.token);
    expect(Number(sessions.rows[0]?.absolute_hours)).toBeCloseTo(24, 5);

    const audits = await pool.query<{ event_type: string }>(
      "select event_type from audit_events order by occurred_at",
    );
    expect(audits.rows.map((row) => row.event_type)).toEqual([
      "AUTH_LOGIN_SUCCEEDED",
      "AUTH_LOGIN_SUCCEEDED",
    ]);
  });

  test("rolls back session creation when success auditing fails", async (): Promise<void> => {
    await provisionProductOwner(
      { password: "Owner secure password", username: "Owner" },
      { authStore, passwordCrypto },
    );
    await pool.query(`
      create function fail_login_success_audit() returns trigger
      language plpgsql as $$
      begin
        if new.event_type = 'AUTH_LOGIN_SUCCEEDED' then
          raise exception 'forced login audit failure';
        end if;
        return new;
      end;
      $$;
      create trigger fail_login_success_audit_trigger
      before insert on audit_events
      for each row execute function fail_login_success_audit();
    `);

    try {
      await expect(
        authService.authenticate({
          password: "Owner secure password",
          requestId: null,
          username: "Owner",
        }),
      ).rejects.toThrow("forced login audit failure");
    } finally {
      await pool.query(`
        drop trigger if exists fail_login_success_audit_trigger on audit_events;
        drop function if exists fail_login_success_audit();
      `);
    }

    const counts = await pool.query<{
      audit_count: string;
      session_count: string;
    }>(`
      select
        (select count(*) from audit_events)::text as audit_count,
        (select count(*) from auth_sessions)::text as session_count
    `);
    expect(counts.rows[0]).toEqual({ audit_count: "0", session_count: "0" });
  });
});
