import { createDbPool, createDbClient } from '../adapters/db/client.js';
import { createBossClient } from '../adapters/jobs/boss-client.js';
import { reconcileRestoredRetention } from '../modules/retention/restore-reconciliation.js';

export async function runReconcileRetentionCli() {
  const pool = createDbPool();
  const db = createDbClient(pool);
  const boss = createBossClient();

  const targetDistrictId = process.argv[2];

  console.log('=== Mahalla Ovozi: Disaster-Recovery Retention Reconciliation ===\n');
  if (targetDistrictId) {
    console.log(`Target District: ${targetDistrictId}`);
  } else {
    console.log('Target: ALL Registered Districts');
  }

  try {
    await boss.start();

    const result = await reconcileRestoredRetention(pool, boss, db, targetDistrictId);

    console.log('\n✅ Reconciliation Completed Successfully:');
    console.log(`- Districts Reconciled: ${result.districtsReconciled}`);
    console.log(`- Expired Topics Purged: ${result.totalTopicsPurged}`);
    console.log(`- Accepted Evidence Purged: ${result.totalEvidencePurged}`);
    console.log(`- Topic Projections Purged: ${result.totalProjectionsPurged}`);
    console.log(`- Duration: ${result.durationMs}ms`);
  } catch (error) {
    console.error('Fatal error during retention reconciliation:', error);
    process.exitCode = 1;
  } finally {
    await boss.stop({ graceful: true, timeout: 2000 }).catch(() => {});
    await pool.end();
  }
}

if (process.argv[1]?.includes('reconcile-retention')) {
  runReconcileRetentionCli().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
