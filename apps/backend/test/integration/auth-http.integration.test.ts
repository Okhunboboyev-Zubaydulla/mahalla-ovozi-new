import { PassThrough } from "node:stream";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import pg from "pg";

import { createArgon2idPasswordCrypto } from "../../src/adapters/crypto/argon2id-password-crypto.js";
import { createOpaqueSessionCrypto } from "../../src/adapters/crypto/opaque-session-crypto.js";
import { createPostgresAuthStore } from "../../src/adapters/db/postgres-auth-store.js";
import { createAuthenticationHttpApplication } from "../../src/http/authentication-http-app.js";
import { createAuthService } from "../../src/modules/auth/auth-service.js";
import type { PasswordCrypto } from "../../src/modules/auth/ports.js";
import { provisionProductOwner } from "../../src/modules/auth/provision-product-owner.js";

const { Pool } = pg;
const testDatabaseUrl = process.env["TEST_DATABASE_URL"];

if (testDatabaseUrl === undefined) {
  throw new Error("TEST_DATABASE_URL is required for PostgreSQL integration tests.");
}

const applicationOrigin = "https://mahalla.test";
const ownerPassword = "Owner secure password";
const pool = new Pool({ connectionString: testDatabaseUrl });
const authStore = createPostgresAuthStore(pool);
const productionPasswordCrypto = createArgon2idPasswordCrypto();
const sessionCrypto = createOpaqueSessionCrypto();
const logDestination = new PassThrough();
let verificationCount = 0;
const observedPasswordCrypto: PasswordCrypto = {
  hash: productionPasswordCrypto.hash,
  verify: async (passwordHash, password): Promise<boolean> => {
    verificationCount += 1;
    return productionPasswordCrypto.verify(passwordHash, password);
  },
};
let application: Awaited<ReturnType<typeof createAuthenticationHttpApplication>>;

const trustedMutationHeaders = {
  origin: applicationOrigin,
  "sec-fetch-site": "same-origin",
} as const;

beforeAll(async (): Promise<void> => {
  await pool.query("select 1");
  const dummyPasswordHash = await productionPasswordCrypto.hash(
    "Dummy timing password",
  );
  application = await createAuthenticationHttpApplication({
    applicationOrigin,
    authService: createAuthService({
      authStore,
      dummyPasswordHash,
      passwordCrypto: observedPasswordCrypto,
      sessionCrypto,
    }),
    logDestination,
  });
});

beforeEach(async (): Promise<void> => {
  verificationCount = 0;
  await pool.query(
    "truncate table audit_events, auth_sessions, auth_accounts restart identity cascade",
  );
  await provisionProductOwner(
    { password: ownerPassword, username: "Owner" },
    { authStore, passwordCrypto: productionPasswordCrypto },
  );
});

afterAll(async (): Promise<void> => {
  await application.close();
  await pool.end();
});

const signIn = async () =>
  application.inject({
    headers: trustedMutationHeaders,
    method: "POST",
    payload: { password: ownerPassword, username: "Owner" },
    url: "/api/v1/auth/sign-in",
  });

const signInFrom = async (
  remoteAddress: string,
  password: string,
  username: string,
) =>
  application.inject({
    headers: trustedMutationHeaders,
    method: "POST",
    payload: { password, username },
    remoteAddress,
    url: "/api/v1/auth/sign-in",
  });

const requireSessionCookie = (
  setCookieHeader: string | string[] | undefined,
): string => {
  const value = Array.isArray(setCookieHeader)
    ? setCookieHeader[0]
    : setCookieHeader;
  expect(value).toBeDefined();
  return value?.split(";", 1)[0] ?? "";
};

const rejectedOriginCases: readonly Readonly<{
  headers: Readonly<Record<string, string>>;
  label: string;
}>[] = [
  {
    headers: { "sec-fetch-site": "same-origin" },
    label: "missing Origin",
  },
  {
    headers: {
      origin: "https://attacker.test",
      "sec-fetch-site": "same-origin",
    },
    label: "wrong Origin",
  },
  {
    headers: { origin: applicationOrigin, "sec-fetch-site": "same-site" },
    label: "same-site Fetch Metadata",
  },
  {
    headers: { origin: applicationOrigin, "sec-fetch-site": "cross-site" },
    label: "cross-site Fetch Metadata",
  },
];

describe("Story 1.1 Fastify authentication boundary", () => {
  test("signs in with an actor-only response and a secure host cookie", async (): Promise<void> => {
    const response = await signIn();

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toMatchObject({
      role: "PRODUCT_OWNER",
      username: "Owner",
    });
    expect(response.body).not.toContain("token");
    expect(response.headers["set-cookie"]).toMatch(
      /^__Host-mahalla_session=[^;]+; Path=\/; HttpOnly; Secure; SameSite=Strict$/,
    );
  });

  test("returns the authoritative session without refreshing activity", async (): Promise<void> => {
    const authentication = await signIn();
    const cookie = requireSessionCookie(authentication.headers["set-cookie"]);
    const before = await pool.query<{ last_activity_at: Date }>(
      "select last_activity_at from auth_sessions",
    );

    const response = await application.inject({
      headers: { cookie },
      method: "GET",
      url: "/api/v1/auth/session",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toMatchObject({
      role: "PRODUCT_OWNER",
      username: "Owner",
    });
    const after = await pool.query<{ last_activity_at: Date }>(
      "select last_activity_at from auth_sessions",
    );
    expect(after.rows[0]?.last_activity_at).toEqual(
      before.rows[0]?.last_activity_at,
    );
  });

  test("returns sanitized unauthenticated errors and clears stale session cookies", async (): Promise<void> => {
    const response = await application.inject({
      headers: { cookie: "__Host-mahalla_session=stale-token" },
      method: "GET",
      url: "/api/v1/auth/session",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Тизимга кириш талаб қилинади.",
      },
    });
    expect(response.headers["set-cookie"]).toMatch(
      /^__Host-mahalla_session=; Max-Age=0; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/,
    );
  });

  test("sign-out is idempotent and always clears the matching cookie", async (): Promise<void> => {
    const response = await application.inject({
      headers: {
        ...trustedMutationHeaders,
        cookie: "__Host-mahalla_session=stale-token",
      },
      method: "POST",
      url: "/api/v1/auth/sign-out",
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["set-cookie"]).toMatch(
      /^__Host-mahalla_session=; Max-Age=0; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/,
    );
  });

  test("acknowledges genuine activity only for an authoritative session", async (): Promise<void> => {
    const authentication = await signIn();
    const cookie = requireSessionCookie(authentication.headers["set-cookie"]);
    await pool.query(
      "update auth_sessions set last_activity_at = clock_timestamp() - interval '1 hour'",
    );

    const response = await application.inject({
      headers: { ...trustedMutationHeaders, cookie },
      method: "POST",
      url: "/api/v1/auth/activity",
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    const activity = await pool.query<{ age_seconds: number }>(`
      select extract(epoch from (clock_timestamp() - last_activity_at))
        as age_seconds
      from auth_sessions
    `);
    expect(Number(activity.rows[0]?.age_seconds)).toBeLessThan(5);
  });

  test.each(rejectedOriginCases)(
    "rejects $label before password verification or mutation",
    async ({ headers }): Promise<void> => {
      const response = await application.inject({
        headers,
        method: "POST",
        payload: { password: ownerPassword, username: "Owner" },
        url: "/api/v1/auth/sign-in",
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          code: "REQUEST_ORIGIN_REJECTED",
          message: "Сўров манбаси тасдиқланмади.",
        },
      });
      expect(verificationCount).toBe(0);
      const sessions = await pool.query<{ count: string }>(
        "select count(*)::text as count from auth_sessions",
      );
      expect(sessions.rows[0]?.count).toBe("0");
    },
  );

  test("returns one generic failure and performs dummy verification for missing accounts", async (): Promise<void> => {
    const wrongPassword = await signInFrom(
      "192.0.2.10",
      "Wrong secure password",
      "Owner",
    );
    const missingAccount = await signInFrom(
      "192.0.2.11",
      "Wrong secure password",
      "MissingOwner",
    );

    const expectedError = {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Нотўғри фойдаланувчи номи ёки парол.",
      },
    };
    expect(wrongPassword.statusCode).toBe(401);
    expect(missingAccount.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(expectedError);
    expect(missingAccount.json()).toEqual(expectedError);
    expect(verificationCount).toBe(2);

    const audits = await pool.query<{
      actor_account_id: string | null;
      event_type: string;
      request_id: string | null;
    }>(`
      select event_type, actor_account_id, request_id
      from audit_events
      where event_type = 'AUTH_LOGIN_FAILED'
      order by occurred_at
    `);
    expect(audits.rows).toHaveLength(2);
    expect(audits.rows.every((row) => row.actor_account_id === null)).toBe(true);
    expect(audits.rows.every((row) => row.request_id !== null)).toBe(true);
  });

  test("rate-limits only after ten failed verifications with a retry boundary", async (): Promise<void> => {
    const remoteAddress = "192.0.2.20";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await signInFrom(
        remoteAddress,
        "Wrong secure password",
        "Owner",
      );
      expect(response.statusCode).toBe(401);
    }

    const limited = await signInFrom(
      remoteAddress,
      "Wrong secure password",
      "Owner",
    );

    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Жуда кўп уриниш. Кейинроқ қайта уриниб кўринг.",
      },
    });
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    expect(verificationCount).toBe(10);
    const auditCounts = await pool.query<{ event_type: string; total: string }>(`
      select event_type, count(*)::text as total
      from audit_events
      where event_type in ('AUTH_LOGIN_FAILED', 'AUTH_RATE_LIMITED')
      group by event_type
      order by event_type
    `);
    expect(auditCounts.rows).toEqual([
      { event_type: "AUTH_LOGIN_FAILED", total: "10" },
      { event_type: "AUTH_RATE_LIMITED", total: "1" },
    ]);
  });

  test("advances the failure budget even when failed-login auditing fails", async (): Promise<void> => {
    const remoteAddress = "192.0.2.25";
    await pool.query(`
      create function fail_login_failed_audit() returns trigger
      language plpgsql as $$
      begin
        if new.event_type = 'AUTH_LOGIN_FAILED' then
          raise exception 'forced failed-login audit failure';
        end if;
        return new;
      end;
      $$;
      create trigger fail_login_failed_audit_trigger
      before insert on audit_events
      for each row execute function fail_login_failed_audit();
    `);

    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await signInFrom(
          remoteAddress,
          "Wrong secure password",
          "Owner",
        );
        expect(response.statusCode).toBe(500);
      }
    } finally {
      await pool.query(`
        drop trigger if exists fail_login_failed_audit_trigger on audit_events;
        drop function if exists fail_login_failed_audit();
      `);
    }

    const limited = await signInFrom(
      remoteAddress,
      "Wrong secure password",
      "Owner",
    );
    expect(limited.statusCode).toBe(429);
    expect(verificationCount).toBe(10);
  });

  test("successful authentication does not consume the failure budget", async (): Promise<void> => {
    const remoteAddress = "192.0.2.30";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await signInFrom(remoteAddress, ownerPassword, "Owner");
      expect(response.statusCode).toBe(200);
    }
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await signInFrom(
        remoteAddress,
        "Wrong secure password",
        "Owner",
      );
      expect(response.statusCode).toBe(401);
    }

    const limited = await signInFrom(
      remoteAddress,
      "Wrong secure password",
      "Owner",
    );

    expect(limited.statusCode).toBe(429);
    expect(verificationCount).toBe(20);
  });

  test("origin rejection never consumes the failed-login budget", async (): Promise<void> => {
    const remoteAddress = "192.0.2.40";
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const rejected = await application.inject({
        headers: {
          origin: "https://attacker.test",
          "sec-fetch-site": "cross-site",
        },
        method: "POST",
        payload: { password: ownerPassword, username: "Owner" },
        remoteAddress,
        url: "/api/v1/auth/sign-in",
      });
      expect(rejected.statusCode).toBe(403);
    }

    const credentialFailure = await signInFrom(
      remoteAddress,
      "Wrong secure password",
      "Owner",
    );
    expect(credentialFailure.statusCode).toBe(401);
    expect(verificationCount).toBe(1);
  });

  test("propagates request identifiers into successful login and sign-out audits", async (): Promise<void> => {
    const authentication = await signInFrom(
      "192.0.2.50",
      ownerPassword,
      "Owner",
    );
    const cookie = requireSessionCookie(authentication.headers["set-cookie"]);
    const signOut = await application.inject({
      headers: { ...trustedMutationHeaders, cookie },
      method: "POST",
      remoteAddress: "192.0.2.50",
      url: "/api/v1/auth/sign-out",
    });

    expect(signOut.statusCode).toBe(204);
    const audits = await pool.query<{
      event_type: string;
      request_id: string | null;
    }>(`
      select event_type, request_id
      from audit_events
      where event_type in ('AUTH_LOGIN_SUCCEEDED', 'AUTH_SIGN_OUT')
      order by occurred_at
    `);
    expect(audits.rows.map((row) => row.event_type)).toEqual([
      "AUTH_LOGIN_SUCCEEDED",
      "AUTH_SIGN_OUT",
    ]);
    expect(audits.rows.every((row) => row.request_id !== null)).toBe(true);
  });
});
