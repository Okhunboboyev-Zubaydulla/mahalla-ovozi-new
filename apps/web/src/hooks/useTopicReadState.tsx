import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TopicCardItem } from '@mahalla-ovozi/api-contracts';
import { useAuth } from '../auth/auth-context.js';

export interface TopicReadEntry {
  lastReadCount: number;
  isNewDismissed: boolean;
}

export type TopicReadStore = Record<string, TopicReadEntry>;

export interface TopicFreshnessResult {
  showNewBadge: boolean;
  unreadDelta: number | '+' | null;
}

export interface TopicReadStateContextValue {
  getTopicFreshness: (topic: Pick<TopicCardItem, 'id' | 'evidenceCount' | 'isNew' | 'isUpdated'>) => TopicFreshnessResult;
  markTopicAsRead: (topicId: string, currentEvidenceCount: number) => void;
}

const STORAGE_PREFIX = 'mahalla_ovozi_topic_reads_';

function getStorageKey(districtId: string, userId: string): string {
  return `${STORAGE_PREFIX}${districtId}_${userId}`;
}

function loadReadStore(storageKey: string): TopicReadStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveReadStore(storageKey: string, store: TopicReadStore): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // Gracefully ignore QuotaExceeded or Storage Disabled
  }
}

export const TopicReadStateContext = createContext<TopicReadStateContextValue | undefined>(undefined);

export interface TopicReadStateProviderProps {
  children: React.ReactNode;
  districtId?: string;
  userId?: string;
}

export const TopicReadStateProvider: React.FC<TopicReadStateProviderProps> = ({
  children,
  districtId: propDistrictId,
  userId: propUserId,
}) => {
  let authActor = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth();
    authActor = auth.actor;
  } catch {
    // Graceful fallback when rendered in isolated test environment without AuthProvider
  }

  const districtId = propDistrictId || authActor?.districtId || 'default';
  const userId = propUserId || authActor?.id || 'guest';
  const storageKey = useMemo(() => getStorageKey(districtId, userId), [districtId, userId]);

  const [store, setStore] = useState<TopicReadStore>(() => loadReadStore(storageKey));

  // Reload store whenever actor or district switches
  useEffect(() => {
    setStore(loadReadStore(storageKey));
  }, [storageKey]);

  const markTopicAsRead = useCallback(
    (topicId: string, currentEvidenceCount: number) => {
      setStore((prevStore) => {
        const existing = prevStore[topicId];
        const nextStore: TopicReadStore = {
          ...prevStore,
          [topicId]: {
            lastReadCount: Math.max(existing?.lastReadCount ?? 0, currentEvidenceCount),
            isNewDismissed: true,
          },
        };
        saveReadStore(storageKey, nextStore);
        return nextStore;
      });
    },
    [storageKey],
  );

  const getTopicFreshness = useCallback(
    (topic: Pick<TopicCardItem, 'id' | 'evidenceCount' | 'isNew' | 'isUpdated'>): TopicFreshnessResult => {
      const entry = store[topic.id];

      // 1. «Янги мавзу» (New Topic Genesis)
      const showNewBadge = Boolean(topic.isNew && !entry?.isNewDismissed);

      // If the topic is brand-new and unreviewed, Genesis takes precedence (Option A: unreadDelta = null)
      if (showNewBadge) {
        return {
          showNewBadge: true,
          unreadDelta: null,
        };
      }

      // 2. Unread message delta in footer (+[N] or +)
      if (entry) {
        const delta = topic.evidenceCount - entry.lastReadCount;
        return {
          showNewBadge: false,
          unreadDelta: delta > 0 ? delta : null,
        };
      }

      // 3. Cold-Start for existing topics without localStorage history
      if (topic.isUpdated) {
        return {
          showNewBadge: false,
          unreadDelta: '+',
        };
      }

      return {
        showNewBadge: false,
        unreadDelta: null,
      };
    },
    [store],
  );

  const value = useMemo(
    () => ({
      getTopicFreshness,
      markTopicAsRead,
    }),
    [getTopicFreshness, markTopicAsRead],
  );

  return <TopicReadStateContext.Provider value={value}>{children}</TopicReadStateContext.Provider>;
};

/**
 * Hook to access topic read state.
 * If used outside TopicReadStateProvider (e.g. isolated unit test), falls back gracefully.
 */
export function useTopicReadState(): TopicReadStateContextValue {
  const context = useContext(TopicReadStateContext);
  if (!context) {
    return {
      getTopicFreshness: (topic) => ({
        showNewBadge: topic.isNew,
        unreadDelta: !topic.isNew && topic.isUpdated ? '+' : null,
      }),
      markTopicAsRead: () => {},
    };
  }
  return context;
}
