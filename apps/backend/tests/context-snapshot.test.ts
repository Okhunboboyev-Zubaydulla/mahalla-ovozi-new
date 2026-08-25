import { describe, it, expect } from 'vitest';
import {
  computeSnapshotFingerprint,
  verifySnapshotIntegrity,
  assertSnapshotRevision,
  StaleSnapshotRevisionError,
  MahallaDailySnapshot,
  AcceptedEvidenceItem,
} from '../src/modules/ai/context-snapshot.js';

describe('Context Snapshot Kernel & Cryptographic Integrity Tests (AD-5, AD-6)', () => {
  const sampleEvidence: AcceptedEvidenceItem[] = [
    {
      id: 'ev_1',
      telegramMessageId: '1001',
      originalTimestamp: '2026-08-25T10:00:00.000Z',
      verbatimText: 'Elektr ta`minotida uzilishlar bo`lyapti',
      lane: 'COMMUNAL_SERVICES',
    },
    {
      id: 'ev_2',
      telegramMessageId: '1002',
      originalTimestamp: '2026-08-25T10:05:00.000Z',
      verbatimText: 'Yo`l ta`mirlash ishlari to`xtab qoldi',
      lane: 'ROADS_AND_TRANSPORT',
    },
  ];

  it('computes deterministic SHA-256 fingerprint for non-empty evidence array', () => {
    const hash1 = computeSnapshotFingerprint(sampleEvidence);
    const hash2 = computeSnapshotFingerprint(sampleEvidence);
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(64); // SHA-256 hex string
  });

  it('returns sentinel empty hash for empty evidence list', () => {
    expect(computeSnapshotFingerprint([])).toBe('sha256_empty_v1');
  });

  it('verifies integrity of valid snapshot successfully', () => {
    const validSnapshot: MahallaDailySnapshot = {
      districtId: 'dist_1',
      mahallaName: 'Navbahor',
      calendarDay: '2026-08-25',
      contextRevision: 2,
      snapshotFingerprint: computeSnapshotFingerprint(sampleEvidence),
      evidence: sampleEvidence,
    };

    expect(verifySnapshotIntegrity(validSnapshot)).toBe(true);
  });

  it('rejects snapshot with tampered fingerprint', () => {
    const tamperedSnapshot: MahallaDailySnapshot = {
      districtId: 'dist_1',
      mahallaName: 'Navbahor',
      calendarDay: '2026-08-25',
      contextRevision: 2,
      snapshotFingerprint: 'tampered_fake_sha256_hash_1234567890abcdef',
      evidence: sampleEvidence,
    };

    expect(verifySnapshotIntegrity(tamperedSnapshot)).toBe(false);
  });

  it('rejects snapshot with mismatched contextRevision count', () => {
    const mismatchedRevisionSnapshot: MahallaDailySnapshot = {
      districtId: 'dist_1',
      mahallaName: 'Navbahor',
      calendarDay: '2026-08-25',
      contextRevision: 999, // Should be 2
      snapshotFingerprint: computeSnapshotFingerprint(sampleEvidence),
      evidence: sampleEvidence,
    };

    expect(verifySnapshotIntegrity(mismatchedRevisionSnapshot)).toBe(false);
  });

  it('assertSnapshotRevision succeeds when revisions match (CAS pass)', () => {
    expect(() => assertSnapshotRevision(5, 5)).not.toThrow();
  });

  it('assertSnapshotRevision throws StaleSnapshotRevisionError on CAS mismatch', () => {
    expect(() => assertSnapshotRevision(6, 5)).toThrow(StaleSnapshotRevisionError);
    try {
      assertSnapshotRevision(6, 5);
    } catch (err) {
      expect(err).toBeInstanceOf(StaleSnapshotRevisionError);
      const staleErr = err as StaleSnapshotRevisionError;
      expect(staleErr.code).toBe('STALE_SNAPSHOT');
      expect(staleErr.status).toBe(409);
    }
  });
});
