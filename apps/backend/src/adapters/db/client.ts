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
