import { Readable, Writable } from "node:stream";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import pg from "pg";

import { executeProductOwnerAccountCommand } from "../../src/entrypoints/product-owner-account.js";

const { Pool } = pg;
const testDatabaseUrl = process.env["TEST_DATABASE_URL"];

if (testDatabaseUrl === undefined) {
  throw new Error("TEST_DATABASE_URL is required for PostgreSQL integration tests.");
}

const pool = new Pool({ connectionString: testDatabaseUrl });

beforeAll(async (): Promise<void> => {
  await pool.query("select 1");
});

beforeEach(async (): Promise<void> => {
  await pool.query(
    "truncate table audit_events, auth_sessions, auth_accounts restart identity cascade",
  );
});

afterAll(async (): Promise<void> => {
  await pool.end();
});

const createOutputCapture = (): Readonly<{
  read: () => string;
  stream: Writable;
}> => {
  const chunks: Buffer[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback): void {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });

  return {
    read: (): string => Buffer.concat(chunks).toString("utf8"),
    stream,
  };
};

describe("Story 1.1 Product Owner maintenance command", () => {
  test("reads the password from stdin and emits only safe account metadata", async (): Promise<void> => {
    const password = "  Command secure password  ";
    const stdin = Readable.from([`${password}\n`]);
    const stdout = createOutputCapture();
    const stderr = createOutputCapture();

    const exitCode = await executeProductOwnerAccountCommand({
      arguments: [],
      environment: {
        DATABASE_URL: testDatabaseUrl,
        PRODUCT_OWNER_USERNAME: "  Owner  ",
      },
      stderr: stderr.stream,
      stdin,
      stdout: stdout.stream,
    });

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe("");
    expect(stdout.read()).toMatch(/^Product Owner created: Owner \([a-f0-9-]+\)\n$/);
    expect(stdout.read()).not.toContain(password);

    const row = await pool.query<{ password_hash: string }>(
      "select password_hash from auth_accounts where username = 'Owner'",
    );
    expect(row.rows[0]?.password_hash).toMatch(/^\$argon2id\$/);
    expect(row.rows[0]?.password_hash).not.toContain(password);
  });

  test("rejects interactive TTY input instead of risking echoed secrets", async (): Promise<void> => {
    const stdin = Readable.from(["irrelevant"]);
    Object.defineProperty(stdin, "isTTY", { value: true });
    const stdout = createOutputCapture();
    const stderr = createOutputCapture();

    const exitCode = await executeProductOwnerAccountCommand({
      arguments: [],
      environment: {
        DATABASE_URL: testDatabaseUrl,
        PRODUCT_OWNER_USERNAME: "Owner",
      },
      stderr: stderr.stream,
      stdin,
      stdout: stdout.stream,
    });

    expect(exitCode).toBe(1);
    expect(stdout.read()).toBe("");
    expect(stderr.read()).toBe(
      "Product Owner account command failed: password must be supplied through non-interactive stdin.\n",
    );
  });
});
