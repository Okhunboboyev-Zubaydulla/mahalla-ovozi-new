/**
 * Topic Retention Domain Types & Contract Definitions
 * Governed by FR-12, AD-3, AD-4, AD-9, AD-11.
 */

export interface RetentionPurgeResult {
  topicId: string;
  districtId: string;
  evidenceCount: number;
  projectionsCount: number;
  purged: boolean;
  reason?: 'SUCCESS' | 'EXTENDED_BY_NEWER_EVIDENCE' | 'TOPIC_NOT_FOUND' | 'LOCKED_OR_ERROR';
}

export interface RetentionScanOptions {
  limit?: number;
}

export interface RetentionBatchResult {
  districtId: string;
  topicsEvaluated: number;
  topicsPurged: number;
  evidencePurged: number;
  projectionsPurged: number;
  durationMs: number;
}

export interface DisasterRestoreReconciliationResult {
  districtsReconciled: number;
  totalTopicsPurged: number;
  totalEvidencePurged: number;
  totalProjectionsPurged: number;
  durationMs: number;
}
