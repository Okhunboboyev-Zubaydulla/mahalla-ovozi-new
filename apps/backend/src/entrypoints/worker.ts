import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type PgBoss from 'pg-boss';
import {
  createBossClient,
  initBossQueues,
  TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
} from '../adapters/jobs/boss-client.js';

let activeBossInstance: PgBoss | null = null;

export async function startWorker(customBoss?: PgBoss): Promise<PgBoss> {
  const boss = customBoss || createBossClient();
  activeBossInstance = boss;

  boss.on('error', (error) => {
    console.error('[worker:pg-boss] Background queue error:', error);
  });

  await boss.start();
  await initBossQueues(boss);

  // Register worker for telegram-content-qualification
  // Note: Story 2.2 will implement full content qualification logic;
  // Story 2.1 establishes queue contracts and worker runtime readiness.
  await boss.work(TELEGRAM_CONTENT_QUALIFICATION_QUEUE, async (jobs) => {
    for (const job of jobs) {
      console.log('[worker] Received qualification job', {
        jobId: job.id,
        name: job.name,
      });
    }
  });

  console.log('[worker] Mahalla Ovozi worker process started successfully');
  return boss;
}

export async function stopWorker(bossInstance?: PgBoss): Promise<void> {
  const boss = bossInstance || activeBossInstance;
  if (boss) {
    console.log('[worker] Stopping pg-boss worker gracefully...');
    await boss.stop({ graceful: true, timeout: 30000 });
    console.log('[worker] pg-boss worker stopped.');
    if (activeBossInstance === boss) {
      activeBossInstance = null;
    }
  }
}

// Graceful shutdown handling for standalone process
const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  startWorker().catch((err) => {
    console.error('[worker] Failed to start worker:', err);
    process.exit(1);
  });

  let isShuttingDown = false;
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[worker] Received ${signal}, initiating graceful shutdown...`);
    await stopWorker();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
