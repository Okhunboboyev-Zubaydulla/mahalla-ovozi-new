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
let logOutput = "";
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
  logDestination.setEncoding("utf8");
  logDestination.on("data", (chunk: string) => {
    logOutput += chunk;
  });
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
  logOutput = "";
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

const waitForLogs = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
};

describe("Story 1.1 HTTP parsing and sanitized errors", () => {
  test("rejects an authentication body over 8 KiB before password verification", async (): Promise<void> => {
    const response = await application.inject({
      headers: {
        ...trustedMutationHeaders,
        "content-type": "application/json",
      },
      method: "POST",
      payload: JSON.stringify({
        password: "x".repeat(9_000),
        username: "Owner",
      }),
      url: "/api/v1/auth/sign-in",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Сўров маълумотлари нотўғри.",
      },
    });
    expect(verificationCount).toBe(0);
  });

  test.each([
    ["sign-out", JSON.stringify({ unexpected: true })],
    ["activity", JSON.stringify({ unexpected: true })],
    ["sign-out", JSON.stringify({ padding: "x".repeat(9_000) })],
    ["activity", JSON.stringify({ padding: "x".repeat(9_000) })],
  ])(
    "rejects an undefined or oversized %s request body",
    async (route, payload): Promise<void> => {
      const response = await application.inject({
        headers: {
          ...trustedMutationHeaders,
          "content-type": "application/json",
        },
        method: "POST",
        payload,
        url: `/api/v1/auth/${route}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: { code: "VALIDATION_ERROR" },
      });
      expect(verificationCount).toBe(0);
    },
  );

  test.each([
    ["malformed JSON", "application/json", '{"username":'],
    ["unsupported media type", "text/plain", "not-json"],
  ])(
    "maps %s to the stable validation error",
    async (_label, contentType, payload): Promise<void> => {
      const response = await application.inject({
        headers: {
          ...trustedMutationHeaders,
          "content-type": contentType,
        },
        method: "POST",
        payload,
        url: "/api/v1/auth/sign-in",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Сўров маълумотлари нотўғри.",
        },
      });
      expect(verificationCount).toBe(0);
    },
  );

  test("rejects unknown credential fields before password verification", async (): Promise<void> => {
    const response = await application.inject({
      headers: trustedMutationHeaders,
      method: "POST",
      payload: {
        password: ownerPassword,
        role: "PRODUCT_OWNER",
        username: "Owner",
      },
      url: "/api/v1/auth/sign-in",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(verificationCount).toBe(0);
  });

  test("sanitizes an unexpected PostgreSQL failure in both HTTP and logs", async (): Promise<void> => {
    await pool.query("alter table auth_accounts rename to auth_accounts_unavailable");
    let response;
    try {
      response = await application.inject({
        headers: trustedMutationHeaders,
        method: "POST",
        payload: { password: ownerPassword, username: "Owner" },
        url: "/api/v1/auth/sign-in",
      });
    } finally {
      await pool.query(
        "alter table auth_accounts_unavailable rename to auth_accounts",
      );
    }
    await waitForLogs();

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Серверда ички хато юз берди.",
      },
    });
    expect(response.body).not.toContain("auth_accounts");
    expect(logOutput).not.toContain("auth_accounts");
    expect(logOutput).toContain('"errorCategory":"INTERNAL_ERROR"');
  });
});

describe("Story 1.1 structured security logging", () => {
  test("records only allowlisted authentication request metadata", async (): Promise<void> => {
    const response = await application.inject({
      headers: trustedMutationHeaders,
      method: "POST",
      payload: { password: ownerPassword, username: "Owner" },
      remoteAddress: "192.0.2.99",
      url: "/api/v1/auth/sign-in",
    });
    await waitForLogs();

    expect(response.statusCode).toBe(200);
    const records = logOutput
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
    const requestRecord = records.find(
      (record) => record["securityEvent"] === "AUTH_HTTP_REQUEST",
    );
    expect(requestRecord).toMatchObject({
      method: "POST",
      route: "/api/v1/auth/sign-in",
      securityEvent: "AUTH_HTTP_REQUEST",
      statusCode: 200,
    });
    expect(requestRecord?.["requestId"]).toEqual(expect.any(String));
    expect(requestRecord?.["durationMs"]).toEqual(expect.any(Number));
    expect(logOutput).not.toContain(ownerPassword);
    expect(logOutput).not.toContain("192.0.2.99");
    expect(logOutput).not.toContain("set-cookie");
  });

  test("redacts accidental credential, session, and header fields", async (): Promise<void> => {
    const secrets = {
      authorization: "Bearer browser-visible-secret",
      cookie: "__Host-mahalla_session=raw-cookie-secret",
      password: "raw-password-secret",
      passwordHash: "$argon2id$raw-password-hash",
      sessionToken: "raw-session-token",
      tokenHash: "raw-session-token-hash",
    } as const;

    application.log.info(
      {
        accidental: {
          password: secrets.password,
          passwordHash: secrets.passwordHash,
          sessionToken: secrets.sessionToken,
          tokenHash: secrets.tokenHash,
        },
        req: {
          headers: {
            authorization: secrets.authorization,
            cookie: secrets.cookie,
          },
        },
        res: { headers: { "set-cookie": secrets.cookie } },
      },
      "redaction probe",
    );
    await waitForLogs();

    for (const secret of Object.values(secrets)) {
      expect(logOutput).not.toContain(secret);
    }
    expect(logOutput).toContain("[REDACTED]");
  });
});
