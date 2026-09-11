import { useEffect, useState, startTransition, RefObject } from 'react';

export interface UseBottomSentinelObserverOptions {
  rootRef: RefObject<HTMLElement | null>;
  sentinelRef: RefObject<HTMLElement | null>;
  thresholdOffsetPx: number;
  enabled: boolean;
}

/**
 * Zero-overhead scroll position detection using native IntersectionObserver.
 * Completely replaces onScroll event listeners, eliminating layout thrashing and main-thread lag.
 */
export function useBottomSentinelObserver({
  rootRef,
  sentinelRef,
  thresholdOffsetPx,
  enabled,
}: UseBottomSentinelObserverOptions): boolean {
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled) {
      setIsScrolledUp(false);
      return;
    }

    const root = rootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) {
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    // Positive bottom rootMargin extends the intersection trigger zone upwards by thresholdOffsetPx
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;

        // When sentinel is NOT intersecting with (viewport + buffer), the user is scrolled up
        const scrolledUp = !entry.isIntersecting;
        startTransition(() => {
          setIsScrolledUp(scrolledUp);
        });
      },
      {
        root,
        rootMargin: `0px 0px ${thresholdOffsetPx}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [rootRef, sentinelRef, thresholdOffsetPx, enabled]);

  return isScrolledUp;
}
