import { createDbPool } from '../adapters/db/client.js';

export async function cleanTestData() {
  const pool = createDbPool();
  console.log('=== Cleaning Test Fixtures from Database ===\n');

  try {
    const keepDistrictId = 'dist_c0934b97-2d90-4a15-83a7-80e6787fa2be';

    // 1. Initial count
    const initialDistricts = await pool.query('SELECT count(*) FROM districts');
    const initialAccounts = await pool.query('SELECT count(*) FROM accounts');
    console.log(`Current Districts: ${initialDistricts.rows[0].count}`);
    console.log(`Current Accounts: ${initialAccounts.rows[0].count}\n`);

    // 2. Link real Hokim account to genuine Sharof Rashidov district
    await pool.query(
      "UPDATE accounts SET district_id = $1 WHERE username = 'Sharof_Rashidov'",
      [keepDistrictId]
    );

    // 3. Delete test sessions
    const delSessions = await pool.query(
      "DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE username NOT IN ('Zubaydulla', 'Sharof_Rashidov'))"
    );
    console.log(`Deleted ${delSessions.rowCount} test sessions.`);

    // 4. Delete test accounts (keep Zubaydulla and Sharof_Rashidov)
    const delAccounts = await pool.query(
      "DELETE FROM accounts WHERE username NOT IN ('Zubaydulla', 'Sharof_Rashidov')"
    );
    console.log(`Deleted ${delAccounts.rowCount} test accounts.`);

    // 5. Delete test districts (cascades to bots, groups, intakes, ai operations)
    const delDistricts = await pool.query(
      "DELETE FROM districts WHERE id != $1",
      [keepDistrictId]
    );
    console.log(`Deleted ${delDistricts.rowCount} test districts.`);

    // 6. Verify final counts
    const finalDistricts = await pool.query('SELECT count(*) FROM districts');
    const finalAccounts = await pool.query('SELECT count(*) FROM accounts');
    console.log(`\n✅ Final Districts Count: ${finalDistricts.rows[0].count}`);
    console.log(`✅ Final Accounts Count: ${finalAccounts.rows[0].count}`);

    const remaining = await pool.query('SELECT id, name, region, status FROM districts');
    console.log('\nRemaining districts:', remaining.rows);

    const remainingAccounts = await pool.query('SELECT id, username, role, district_id FROM accounts');
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
