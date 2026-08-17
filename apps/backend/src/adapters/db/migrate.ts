import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDbPool, createDbClient } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(connectionString?: string) {
  const pool = createDbPool(connectionString);
  const db = createDbClient(pool);
  const migrationsFolder = path.resolve(__dirname, '../../../drizzle');

  try {
    console.log(`[db:migrate] Running migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log('[db:migrate] Migrations completed successfully.');
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === __filename) {
  runMigrations().catch((err) => {
    console.error('[db:migrate] Migration failed:', err);
    process.exit(1);
  });
}
