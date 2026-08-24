import { createContext, useContext } from 'react';

export interface LiveAnnouncerContextValue {
  message: string;
  announce: (message: string) => void;
  announceTopicUpdate: (newCount: number, updatedCount: number) => void;
}

export const LiveAnnouncerContext = createContext<LiveAnnouncerContextValue | undefined>(undefined);

export function useLiveAnnouncer(): LiveAnnouncerContextValue {
  const context = useContext(LiveAnnouncerContext);
  if (!context) {
    throw new Error('useLiveAnnouncer must be used within a LiveAnnouncerProvider');
  }
  return context;
}

export function formatTopicUpdateAnnouncement(newCount: number, updatedCount: number): string | null {
  if (newCount > 0 && updatedCount > 0) {
    return `${newCount} та янги мавзу қўшилди, ${updatedCount} таси янгиланди.`;
  }
  if (newCount > 0) {
    return `${newCount} та янги мавзу қўшилди.`;
  }
  if (updatedCount > 0) {
    return `${updatedCount} та мавзу янгиланди.`;
  }
  return null;
}

export function formatSearchAnnouncement(count: number): string {
  if (count === 0) {
    return 'Қидирув бўйича ҳеч қандай мавзу топилмади.';
  }
  return `Қидирув бўйича ${count} та мавзу топилди.`;
}

