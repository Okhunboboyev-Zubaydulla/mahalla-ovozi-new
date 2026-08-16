import { afterAll, beforeAll, describe, expect, test } from "vitest";
import pg from "pg";

const { Pool } = pg;

const testDatabaseUrl = process.env["TEST_DATABASE_URL"];

if (testDatabaseUrl === undefined) {
  throw new Error("TEST_DATABASE_URL is required for PostgreSQL integration tests.");
}

const pool = new Pool({ connectionString: testDatabaseUrl });

beforeAll(async (): Promise<void> => {
  await pool.query("select 1");
});

afterAll(async (): Promise<void> => {
  await pool.end();
});

describe("Story 1.1 PostgreSQL foundation", () => {
  test("runs against PostgreSQL 18", async (): Promise<void> => {
    const result = await pool.query<{ server_version_num: string }>(
      "show server_version_num",
    );

    expect(result.rows[0]?.server_version_num).toMatch(/^18/);
  });

  test("creates only the approved authentication tables", async (): Promise<void> => {
    const result = await pool.query<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      "audit_events",
      "auth_accounts",
      "auth_sessions",
    ]);
  });

  test("enforces the required authentication storage boundaries", async (): Promise<void> => {
    const indexes = await pool.query<{ indexname: string; indexdef: string }>(`
      select indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
      order by indexname
    `);
    const indexDefinitions = new Map(
      indexes.rows.map((row) => [row.indexname, row.indexdef]),
    );

    expect(indexDefinitions.get("auth_accounts_username_unique")).toContain(
      "UNIQUE",
    );
    expect(indexDefinitions.get("auth_accounts_one_product_owner_idx")).toContain(
      "WHERE (role = 'PRODUCT_OWNER'::auth_role)",
    );
    expect(indexDefinitions.get("auth_sessions_token_hash_unique")).toContain(
      "UNIQUE",
    );
    expect(indexDefinitions.has("auth_sessions_account_id_idx")).toBe(true);

    const sessionColumns = await pool.query<{
      column_name: string;
      data_type: string;
    }>(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = 'auth_sessions'
      order by column_name
    `);
    const sessionColumnTypes = new Map(
      sessionColumns.rows.map((row) => [row.column_name, row.data_type]),
    );

    expect(sessionColumnTypes.has("token")).toBe(false);
    expect(sessionColumnTypes.get("token_hash")).toBe("text");
    expect(sessionColumnTypes.get("created_at")).toBe(
      "timestamp with time zone",
    );
    expect(sessionColumnTypes.get("last_activity_at")).toBe(
      "timestamp with time zone",
    );
    expect(sessionColumnTypes.get("absolute_expires_at")).toBe(
      "timestamp with time zone",
    );
    expect(sessionColumnTypes.get("revoked_at")).toBe(
      "timestamp with time zone",
    );

    const auditActorForeignKey = await pool.query<{ delete_rule: string }>(`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu
        on rc.constraint_schema = kcu.constraint_schema
        and rc.constraint_name = kcu.constraint_name
      where kcu.table_schema = 'public'
        and kcu.table_name = 'audit_events'
        and kcu.column_name = 'actor_account_id'
    `);

    expect(auditActorForeignKey.rows[0]?.delete_rule).toBe("SET NULL");
  });
});
