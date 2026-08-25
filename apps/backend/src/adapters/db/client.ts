import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

export function createDbPool(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL || 'postgresql://mahalla_user:mahalla_dev_password@localhost:5433/mahalla_ovozi';
  return new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export function createDbClient(pool: pg.Pool) {
  return drizzle(pool, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
export type DbOrTx = DbClient | Parameters<Parameters<DbClient['transaction']>[0]>[0];

export interface DbHealthResult {
  isHealthy: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Performs a non-blocking database connection probe with timeout boundary (AD-11).
 */
export async function checkDbHealth(
  pool: pg.Pool,
  timeoutMs: number = 3000,
): Promise<DbHealthResult> {
  const startTime = performance.now();
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Database health check timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    const queryPromise = pool.query('SELECT 1 AS health');
    await Promise.race([queryPromise, timeoutPromise]);

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      isHealthy: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      isHealthy: false,
      latencyMs,
      error: errorMsg,
    };
  }
}

/**
 * Gracefully closes the database connection pool, draining active clients.
 */
export async function closeDbPool(pool: pg.Pool): Promise<void> {
  try {
    await pool.end();
  } catch (err: unknown) {
    console.error('[db:client] Error while closing database pool:', err);
  }
}


