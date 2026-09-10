import { useState, useEffect, useCallback, useMemo } from 'react';
import { QualifyingLane, QualifyingLaneSchema } from '@mahalla-ovozi/api-contracts';

export const CANONICAL_LANE_ORDER: readonly QualifyingLane[] = [
  'HOKIM_RELATED',
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
];

const STORAGE_PREFIX = 'mahalla_ovozi_lane_order_';

export function getLaneOrderStorageKey(districtId: string | undefined, userId: string | undefined): string {
  const dId = districtId ? districtId : 'default';
  const uId = userId ? userId : 'default';
  return `${STORAGE_PREFIX}${dId}_${uId}`;
}

export function reconcileLaneOrder(raw: unknown): QualifyingLane[] {
  if (!Array.isArray(raw)) {
    return [...CANONICAL_LANE_ORDER];
  }

  const validLanes: QualifyingLane[] = [];
  for (const item of raw) {
    const parseResult = QualifyingLaneSchema.safeParse(item);
    if (parseResult.success && !validLanes.includes(parseResult.data)) {
      validLanes.push(parseResult.data);
    }
  }

  for (const canonicalLane of CANONICAL_LANE_ORDER) {
    if (!validLanes.includes(canonicalLane)) {
      validLanes.push(canonicalLane);
    }
  }

  return validLanes;
}

export function loadLaneOrderPreference(
  districtId: string | undefined,
  userId: string | undefined
): QualifyingLane[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [...CANONICAL_LANE_ORDER];
  }

  try {
    const storageKey = getLaneOrderStorageKey(districtId, userId);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [...CANONICAL_LANE_ORDER];
    }
    const parsed: unknown = JSON.parse(raw);
    return reconcileLaneOrder(parsed);
  } catch {
    return [...CANONICAL_LANE_ORDER];
  }
}

export function saveLaneOrderPreference(
  districtId: string | undefined,
  userId: string | undefined,
  order: QualifyingLane[]
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const storageKey = getLaneOrderStorageKey(districtId, userId);
    const reconciled = reconcileLaneOrder(order);
    window.localStorage.setItem(storageKey, JSON.stringify(reconciled));
  } catch {
    // Gracefully ignore QuotaExceeded or Storage Disabled in restricted/private modes
  }
}

export function clearLaneOrderPreference(
  districtId: string | undefined,
  userId: string | undefined
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const storageKey = getLaneOrderStorageKey(districtId, userId);
    window.localStorage.removeItem(storageKey);
  } catch {
    // Gracefully ignore storage exceptions
  }
}

export function isOrderDifferentFromCanonical(order: readonly QualifyingLane[]): boolean {
  if (order.length !== CANONICAL_LANE_ORDER.length) {
    return true;
  }
  for (let i = 0; i < order.length; i += 1) {
    if (order[i] !== CANONICAL_LANE_ORDER[i]) {
      return true;
    }
  }
  return false;
}

export interface UseLaneOrderPreferenceResult {
  laneOrder: QualifyingLane[];
  setLaneOrder: (newOrder: QualifyingLane[]) => void;
  resetLaneOrder: () => void;
  isCustomOrder: boolean;
}

export function useLaneOrderPreference(
  districtId: string | undefined,
  userId: string | undefined
): UseLaneOrderPreferenceResult {
  const [laneOrder, setLaneOrderInternal] = useState<QualifyingLane[]>(() =>
    loadLaneOrderPreference(districtId, userId)
  );

  useEffect(() => {
    setLaneOrderInternal(loadLaneOrderPreference(districtId, userId));
  }, [districtId, userId]);

  const setLaneOrder = useCallback(
    (newOrder: QualifyingLane[]) => {
      const reconciled = reconcileLaneOrder(newOrder);
      setLaneOrderInternal(reconciled);
      saveLaneOrderPreference(districtId, userId, reconciled);
    },
    [districtId, userId]
  );

  const resetLaneOrder = useCallback(() => {
    setLaneOrderInternal([...CANONICAL_LANE_ORDER]);
    clearLaneOrderPreference(districtId, userId);
  }, [districtId, userId]);

  const isCustomOrder = useMemo(
    () => isOrderDifferentFromCanonical(laneOrder),
    [laneOrder]
  );

  return {
    laneOrder,
    setLaneOrder,
    resetLaneOrder,
    isCustomOrder,
  };
}
