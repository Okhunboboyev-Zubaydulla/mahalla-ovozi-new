import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import pg from "pg";

import { createArgon2idPasswordCrypto } from "../../src/adapters/crypto/argon2id-password-crypto.js";
import { createOpaqueSessionCrypto } from "../../src/adapters/crypto/opaque-session-crypto.js";
import { createPostgresAuthStore } from "../../src/adapters/db/postgres-auth-store.js";
import {
  createAuthService,
  InvalidCredentialsError,
} from "../../src/modules/auth/auth-service.js";
import type { PasswordCrypto } from "../../src/modules/auth/ports.js";
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
let dummyPasswordHash: string;
let authService: ReturnType<typeof createAuthService>;

beforeAll(async (): Promise<void> => {
  await pool.query("select 1");
  dummyPasswordHash = await passwordCrypto.hash("Dummy timing password");
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

const provisionAndAuthenticate = async (): Promise<Readonly<{
  accountId: string;
  token: string;
}>> => {
  const account = await provisionProductOwner(
    { password: "Owner secure password", username: "Owner" },
    { authStore, passwordCrypto },
  );
  const authentication = await authService.authenticate({
    password: "Owner secure password",
    requestId: null,
    username: "Owner",
  });

  return { accountId: account.accountId, token: authentication.token };
};

describe("Story 1.1 credential-version concurrency", () => {
  test("a reset committed during verification prevents stale session creation", async (): Promise<void> => {
    await provisionProductOwner(
      { password: "Owner secure password", username: "Owner" },
      { authStore, passwordCrypto },
    );
    const verificationStarted = Promise.withResolvers<void>();
    const resumeVerification = Promise.withResolvers<void>();
    const controlledPasswordCrypto: PasswordCrypto = {
      hash: passwordCrypto.hash,
      verify: async (passwordHash, password): Promise<boolean> => {
        const matches = await passwordCrypto.verify(passwordHash, password);
        verificationStarted.resolve();
        await resumeVerification.promise;
        return matches;
      },
    };
    const racingAuthService = createAuthService({
      authStore,
      dummyPasswordHash,
      passwordCrypto: controlledPasswordCrypto,
      sessionCrypto,
    });

    const staleAuthentication = racingAuthService.authenticate({
      password: "Owner secure password",
      requestId: null,
      username: "Owner",
    });
    await verificationStarted.promise;
    await provisionProductOwner(
      { password: "Replacement secure password", username: "Owner" },
      { authStore, passwordCrypto },
    );
    resumeVerification.resolve();

    await expect(staleAuthentication).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    const sessions = await pool.query<{ count: string }>(
      "select count(*)::text as count from auth_sessions",
    );
    expect(sessions.rows[0]?.count).toBe("0");
  });
});

describe("Story 1.1 server-authoritative session lifetime", () => {
  test("reads do not touch activity while explicit activity does", async (): Promise<void> => {
    const session = await provisionAndAuthenticate();
    const before = await pool.query<{ last_activity_at: Date }>(
      "select last_activity_at from auth_sessions",
    );

    await expect(authService.getSession(session.token)).resolves.toMatchObject({
      accountId: session.accountId,
      role: "PRODUCT_OWNER",
    });
    const afterRead = await pool.query<{ last_activity_at: Date }>(
      "select last_activity_at from auth_sessions",
    );
    expect(afterRead.rows[0]?.last_activity_at).toEqual(
      before.rows[0]?.last_activity_at,
    );

    await pool.query(
      "update auth_sessions set last_activity_at = clock_timestamp() - interval '1 hour'",
    );
    await expect(authService.acknowledgeActivity(session.token)).resolves.toBe(
      true,
    );
    const afterActivity = await pool.query<{ activity_age_seconds: number }>(`
      select extract(epoch from (clock_timestamp() - last_activity_at))
        as activity_age_seconds
      from auth_sessions
    `);
    expect(Number(afterActivity.rows[0]?.activity_age_seconds)).toBeLessThan(5);
  });

  test("rejects inactivity, absolute-expiry, and explicit-revocation states", async (): Promise<void> => {
    const inactive = await provisionAndAuthenticate();
    await pool.query(
      "update auth_sessions set last_activity_at = clock_timestamp() - interval '12 hours'",
    );
    await expect(authService.getSession(inactive.token)).resolves.toBeNull();
    await expect(
      authService.acknowledgeActivity(inactive.token),
    ).resolves.toBe(false);

    await pool.query("truncate table audit_events, auth_sessions restart identity");
    const absoluteExpired = await authService.authenticate({
      password: "Owner secure password",
      requestId: null,
      username: "Owner",
    });
    await pool.query(
      "update auth_sessions set last_activity_at = clock_timestamp(), absolute_expires_at = clock_timestamp()",
    );
    await expect(
      authService.getSession(absoluteExpired.token),
    ).resolves.toBeNull();

    await pool.query("truncate table audit_events, auth_sessions restart identity");
    const explicitlyRevoked = await authService.authenticate({
      password: "Owner secure password",
      requestId: null,
      username: "Owner",
    });
    await expect(authService.revoke(explicitlyRevoked.token)).resolves.toBe(true);
    await expect(
      authService.getSession(explicitlyRevoked.token),
    ).resolves.toBeNull();
  });

  test("sign-out is atomic for an active session and stale repeats are inert", async (): Promise<void> => {
    const session = await provisionAndAuthenticate();

    await expect(authService.signOut(session.token, null)).resolves.toBe(true);
    await expect(authService.signOut(session.token, null)).resolves.toBe(false);

    const state = await pool.query<{
      event_type: string;
      revoked_at: Date | null;
    }>(`
      select s.revoked_at, e.event_type
      from auth_sessions s
      join audit_events e on e.actor_account_id = s.account_id
      where e.event_type = 'AUTH_SIGN_OUT'
    `);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]?.revoked_at).toBeInstanceOf(Date);
    expect(state.rows[0]?.event_type).toBe("AUTH_SIGN_OUT");
  });
});
