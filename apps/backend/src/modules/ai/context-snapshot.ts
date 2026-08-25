import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../../adapters/db/client.js';
import { acceptedEvidence } from '../../adapters/db/schema/accepted-evidence.js';
import { topics } from '../../adapters/db/schema/topics.js';

export interface AcceptedEvidenceItem {
  id: string;
  topicId?: string;
  telegramMessageId: string;
  originalTimestamp: string; // ISO-8601 string
  verbatimText: string;
  lane?: string;
}

export interface MahallaDailySnapshot {
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  contextRevision: number;
  snapshotFingerprint: string;
  evidence: AcceptedEvidenceItem[];
}

export function computeSnapshotFingerprint(evidence: AcceptedEvidenceItem[]): string {
  if (evidence.length === 0) {
    return 'sha256_empty_v1';
  }
  const serialized = evidence
    .map(
      (e) =>
        `${e.id}:${e.telegramMessageId}:${e.originalTimestamp}:${e.verbatimText.trim()}`,
    )
    .join('|');
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Assembles the complete, deterministic same-day Accepted Evidence context snapshot
 * for a specific District, Mahalla, and Uzbekistan calendar day.
 *
 * Deterministic ordering rule:
 * original_timestamp ASC -> telegram_message_id ASC -> id ASC
 */
export async function getMahallaDailySnapshot(
  db: DbClient,
  districtId: string,
  mahallaName: string,
  calendarDay: string,
  injectedEvidence?: AcceptedEvidenceItem[],
): Promise<MahallaDailySnapshot> {
  let evidence: AcceptedEvidenceItem[] = [];

  if (injectedEvidence) {
    // If explicit evidence was passed (e.g. in tests or mock resolver)
    evidence = [...injectedEvidence];
  } else {
    // Retrieve accepted evidence for this mahalla/day directly from accepted_evidence inner-joined with topics
    const rows = await db
      .select({
        id: acceptedEvidence.id,
        topicId: acceptedEvidence.topicId,
        telegramMessageId: acceptedEvidence.telegramMessageId,
        originalTimestamp: acceptedEvidence.originalTimestamp,
        verbatimText: acceptedEvidence.verbatimText,
        lane: topics.primaryLane,
      })
      .from(acceptedEvidence)
      .innerJoin(topics, eq(acceptedEvidence.topicId, topics.id))
      .where(
        and(
          eq(acceptedEvidence.districtId, districtId),
          eq(acceptedEvidence.mahallaName, mahallaName),
          eq(acceptedEvidence.calendarDay, calendarDay),
        ),
      );

    for (const row of rows) {
      evidence.push({
        id: row.id,
        topicId: row.topicId,
        telegramMessageId: row.telegramMessageId,
        originalTimestamp: row.originalTimestamp.toISOString(),
        verbatimText: row.verbatimText,
        lane: row.lane,
      });
    }
  }

  // Deterministic sorting: originalTimestamp ASC -> telegramMessageId ASC -> id ASC
  evidence.sort((a, b) => {
    const timeA = new Date(a.originalTimestamp).getTime();
    const timeB = new Date(b.originalTimestamp).getTime();
    if (timeA !== timeB) return timeA - timeB;

    const msgIdA = BigInt(a.telegramMessageId.replace(/\D/g, '') || '0');
    const msgIdB = BigInt(b.telegramMessageId.replace(/\D/g, '') || '0');
    if (msgIdA !== msgIdB) return msgIdA < msgIdB ? -1 : 1;

    return a.id.localeCompare(b.id);
  });

  const contextRevision = evidence.length;
  const snapshotFingerprint = computeSnapshotFingerprint(evidence);

  return {
    districtId,
    mahallaName,
    calendarDay,
    contextRevision,
    snapshotFingerprint,
    evidence,
  };
}

export class StaleSnapshotRevisionError extends Error {
  readonly code = 'STALE_SNAPSHOT' as const;
  readonly status = 409;
  constructor(currentRevision: number, expectedRevision: number) {
    super(
      `Context snapshot revision mismatch: expected revision ${expectedRevision}, but current revision is ${currentRevision}.`,
    );
    this.name = 'StaleSnapshotRevisionError';
  }
}

/**
 * Cryptographically verifies the internal integrity of a MahallaDailySnapshot (AD-5).
 * Validates that contextRevision matches evidence count and SHA-256 fingerprint matches evidence content.
 */
export function verifySnapshotIntegrity(snapshot: MahallaDailySnapshot): boolean {
  if (!snapshot || !Array.isArray(snapshot.evidence)) {
    return false;
  }
  if (snapshot.contextRevision !== snapshot.evidence.length) {
    return false;
  }
  const expectedFingerprint = computeSnapshotFingerprint(snapshot.evidence);
  return snapshot.snapshotFingerprint === expectedFingerprint;
}

/**
 * Enforces Compare-And-Swap (CAS) optimistic concurrency control on snapshot revisions (AD-6).
 * Throws StaleSnapshotRevisionError if the current revision has diverged from expected.
 */
export function assertSnapshotRevision(currentRevision: number, expectedRevision: number): void {
  if (currentRevision !== expectedRevision) {
    throw new StaleSnapshotRevisionError(currentRevision, expectedRevision);
  }
}

