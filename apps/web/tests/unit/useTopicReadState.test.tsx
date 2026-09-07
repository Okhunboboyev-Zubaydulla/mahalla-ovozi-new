import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TopicReadStateProvider, useTopicReadState } from '../../src/hooks/useTopicReadState.js';

describe('useTopicReadState Hook & Read-Receipt Tests', () => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TopicReadStateProvider districtId="dist_tashkent_1" userId="user_hokim_1">
      {children}
    </TopicReadStateProvider>
  );

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('Test 1: Brand new topic shows showNewBadge = true and unreadDelta = null', () => {
    const { result } = renderHook(() => useTopicReadState(), { wrapper });

    const freshness = result.current.getTopicFreshness({
      id: 'topic_1',
      evidenceCount: 1,
      isNew: true,
      isUpdated: false,
    });

    expect(freshness.showNewBadge).toBe(true);
    expect(freshness.unreadDelta).toBeNull();
  });

  it('Test 2: Marking a brand new topic as read dismisses showNewBadge and locks baseline', () => {
    const { result } = renderHook(() => useTopicReadState(), { wrapper });

    act(() => {
      result.current.markTopicAsRead('topic_1', 2);
    });

    const freshness = result.current.getTopicFreshness({
      id: 'topic_1',
      evidenceCount: 2,
      isNew: true,
      isUpdated: false,
    });

    expect(freshness.showNewBadge).toBe(false);
    expect(freshness.unreadDelta).toBeNull();
  });

  it('Test 3: Subsequent messages after review trigger numeric unreadDelta (+N) in footer', () => {
    const { result } = renderHook(() => useTopicReadState(), { wrapper });

    // Review topic at count 2
    act(() => {
      result.current.markTopicAsRead('topic_1', 2);
    });

    // Evidence count increases to 5
    const freshness = result.current.getTopicFreshness({
      id: 'topic_1',
      evidenceCount: 5,
      isNew: true,
      isUpdated: true,
    });

    expect(freshness.showNewBadge).toBe(false);
    expect(freshness.unreadDelta).toBe(3);
  });

  it('Test 4: Marking an updated topic as read clears the unreadDelta', () => {
    const { result } = renderHook(() => useTopicReadState(), { wrapper });

    // Mark as read after count grew to 5
    act(() => {
      result.current.markTopicAsRead('topic_1', 5);
    });

    const freshness = result.current.getTopicFreshness({
      id: 'topic_1',
      evidenceCount: 5,
      isNew: true,
      isUpdated: true,
    });

    expect(freshness.showNewBadge).toBe(false);
    expect(freshness.unreadDelta).toBeNull();
  });

  it('Test 5: Cold-start updated topic without prior history shows unreadDelta = "+"', () => {
    const { result } = renderHook(() => useTopicReadState(), { wrapper });

    const freshness = result.current.getTopicFreshness({
      id: 'topic_cold_unrecorded',
      evidenceCount: 4,
      isNew: false,
      isUpdated: true,
    });

    expect(freshness.showNewBadge).toBe(false);
    expect(freshness.unreadDelta).toBe('+');
  });

  it('Test 6: Persists read status in localStorage across provider reloads', () => {
    const { result, unmount } = renderHook(() => useTopicReadState(), { wrapper });

    act(() => {
      result.current.markTopicAsRead('topic_persisted', 7);
    });
    unmount();

    // Re-mount hook with fresh state
    const { result: newResult } = renderHook(() => useTopicReadState(), { wrapper });
    const freshness = newResult.current.getTopicFreshness({
      id: 'topic_persisted',
      evidenceCount: 9,
      isNew: false,
      isUpdated: true,
    });

    expect(freshness.unreadDelta).toBe(2);
  });

  it('Test 7: markTopicAsRead is monotonic and does not regress lastReadCount from stale calls', () => {
    const { result } = renderHook(() => useTopicReadState(), { wrapper });

    act(() => {
      result.current.markTopicAsRead('topic_mono', 5);
    });

    // Stale closure or out-of-order event attempts to mark with count 3
    act(() => {
      result.current.markTopicAsRead('topic_mono', 3);
    });

    // Freshness at count 5 should still have unreadDelta = null
    const freshnessAt5 = result.current.getTopicFreshness({
      id: 'topic_mono',
      evidenceCount: 5,
      isNew: false,
      isUpdated: true,
    });
    expect(freshnessAt5.unreadDelta).toBeNull();

    // Freshness at count 6 should have delta = 1 (not 6 - 3 = 3)
    const freshnessAt6 = result.current.getTopicFreshness({
      id: 'topic_mono',
      evidenceCount: 6,
      isNew: false,
      isUpdated: true,
    });
    expect(freshnessAt6.unreadDelta).toBe(1);
  });
});
