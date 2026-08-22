import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../../adapters/db/client.js';
import { aiOperations } from '../../adapters/db/schema/ai.js';
import { telegramIntakeRecords } from '../../adapters/db/schema/telegram-intakes.js';

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
    // If explicit evidence was passed (e.g. In tests or topic store)
    evidence = [...injectedEvidence];
  } else {
    // Retrieve historical accepted relevant operations for this mahalla/day
    const relevantOps = await db
      .select({
        operationId: aiOperations.id,
        targetId: aiOperations.targetId,
        contextRevision: aiOperations.contextRevision,
        resultPayload: aiOperations.resultPayload,
        intakeId: telegramIntakeRecords.id,
        telegramMessageId: telegramIntakeRecords.telegramMessageId,
        originalTimestamp: telegramIntakeRecords.originalTimestamp,
        rawPayload: telegramIntakeRecords.rawPayload,
      })
      .from(aiOperations)
      .innerJoin(telegramIntakeRecords, eq(aiOperations.targetId, telegramIntakeRecords.id))
      .where(
        and(
          eq(aiOperations.districtId, districtId),
          eq(aiOperations.mahallaName, mahallaName),
          eq(aiOperations.calendarDay, calendarDay),
          eq(aiOperations.finalStatus, 'COMPLETED_RELEVANT'),
        ),
      );

    for (const row of relevantOps) {
      const payload = row.rawPayload as Record<string, any>;
      const text =
        payload?.text ||
        payload?.caption ||
        payload?.message?.text ||
        payload?.message?.caption ||
        '';

      if (text) {
        evidence.push({
          id: row.operationId,
          telegramMessageId: row.telegramMessageId,
          originalTimestamp: row.originalTimestamp.toISOString(),
          verbatimText: text,
          lane: (row.resultPayload as any)?.relevant_lanes?.[0] || (row.resultPayload as any)?.lanes?.[0],
        });
      }
    }
  }

  // Deterministic sorting
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
