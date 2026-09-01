import { createDbPool, createDbClient } from '../adapters/db/client.js';
import { ensureDefaultAiProfiles } from '../adapters/db/seeds.js';

export async function cleanTestData() {
  const pool = createDbPool();
  const db = createDbClient(pool);
  console.log('=== Cleaning Test Fixtures from Development Database ===\n');

  try {
    // 1. Initial count
    const initialDistricts = await pool.query('SELECT count(*) FROM districts');
    const initialAccounts = await pool.query('SELECT count(*) FROM accounts');
    console.log(`Current Districts: ${initialDistricts.rows[0].count}`);
    console.log(`Current Accounts: ${initialAccounts.rows[0].count}\n`);

    // 2. Delete test sessions (keep Zubaydulla sessions)
    const delSessions = await pool.query(
      "DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE username != 'Zubaydulla')"
    );
    console.log(`Deleted ${delSessions.rowCount} test sessions.`);

    // 3. Delete non-Zubaydulla accounts
    const delAccounts = await pool.query(
      "DELETE FROM accounts WHERE username != 'Zubaydulla'"
    );
    console.log(`Deleted ${delAccounts.rowCount} test accounts.`);

    // 4. Delete all districts (cascades to bots, groups, intakes, topics, evidence, ai operations)
    const delDistricts = await pool.query('DELETE FROM districts');
    console.log(`Deleted ${delDistricts.rowCount} test districts.`);

    // 5. Delete stale pending test jobs from pg-boss queue (if table exists)
    try {
      const delJobs = await pool.query(
        "DELETE FROM pgboss.job WHERE state IN ('created', 'retry', 'active')"
      );
      console.log(`Deleted ${delJobs.rowCount} stale test queue jobs.`);
    } catch {
      // pgboss schema might not be initialized in some states
    }

    // 6. Ensure default Ollama AI profiles and baseline global analysis settings
    await ensureDefaultAiProfiles(db);
    console.log('Ensured default Ollama gemma4:12b baseline AI profiles and global configuration.');

    // 7. Verify final counts
    const finalDistricts = await pool.query('SELECT count(*) FROM districts');
    const finalAccounts = await pool.query('SELECT count(*) FROM accounts');
    console.log(`\n✅ Final Districts Count: ${finalDistricts.rows[0].count}`);
    console.log(`✅ Final Accounts Count: ${finalAccounts.rows[0].count}`);

    const remainingAccounts = await pool.query('SELECT id, username, role FROM accounts');
    console.log('\nRemaining accounts:', remainingAccounts.rows);
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes('clean-test-data')) {
  cleanTestData().catch((err) => {
    console.error('Fatal cleanup error:', err);
    process.exit(1);
  });
}
