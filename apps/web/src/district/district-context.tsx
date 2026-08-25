import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface DistrictContextValue {
  activeDistrictId: string | null;
  switchDistrict: (nextId: string) => Promise<void>;
  setActiveDistrictDirectly: (id: string | null) => void;
  registerDirty: (id: string) => void;
  clearDirty: (id: string) => void;
  hasDirtyForms: boolean;
  pendingTransition: (() => void) | null;
  confirmDiscard: () => void;
  cancelTransition: () => void;
  attemptTransition: (action: () => void | Promise<void>) => void;
}

const DistrictContext = createContext<DistrictContextValue | null>(null);

export function DistrictProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeDistrictId, setActiveDistrictId] = useState<string | null>(null);
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());
  const [pendingTransition, setPendingTransition] = useState<(() => void) | null>(null);

  const activeDistrictIdRef = useRef<string | null>(activeDistrictId);
  activeDistrictIdRef.current = activeDistrictId;

  const hasDirtyForms = dirtySet.size > 0;

  const registerDirty = useCallback((id: string) => {
    setDirtySet((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearDirty = useCallback((id: string) => {
    setDirtySet((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const switchSeqRef = useRef<number>(0);

  // P4-B: Atomic district switch sequence in strict order
  const executeSwitch = useCallback(
    async (nextId: string | null) => {
      const seq = ++switchSeqRef.current;
      const prevId = activeDistrictIdRef.current;
      if (prevId && prevId !== nextId) {
        // 1. Signal abort to in-flight prior-district queries (async — await settlement)
        await queryClient.cancelQueries({ queryKey: ['district', prevId] });
        await queryClient.cancelQueries({
          predicate: (query) =>
            query.queryKey.some((part) => typeof part === 'string' && part === prevId),
        });
        // 2. Purge prior-district cache (sync — must fire AFTER cancelQueries resolves)
        queryClient.removeQueries({ queryKey: ['district', prevId] });
        queryClient.removeQueries({
          predicate: (query) =>
            query.queryKey.some((part) => typeof part === 'string' && part === prevId),
        });
      }
      // Drop late execution if a newer switch was initiated
      if (seq !== switchSeqRef.current) return;
      // 3. Clear local interaction state & dirty registry
      setDirtySet(new Set());
      // 4. Activate new district context
      setActiveDistrictId(nextId);
    },
    [queryClient]
  );

  const attemptTransition = useCallback(
    (action: () => void | Promise<void>) => {
      if (dirtySet.size > 0) {
        setPendingTransition(() => async () => {
          setDirtySet(new Set());
          await action();
        });
      } else {
        void action();
      }
    },
    [dirtySet]
  );

  const switchDistrict = useCallback(
    async (nextId: string) => {
      if (nextId === activeDistrictIdRef.current) return;

      if (dirtySet.size > 0) {
        setPendingTransition(() => () => {
          void executeSwitch(nextId);
        });
      } else {
        await executeSwitch(nextId);
      }
    },
    [dirtySet, executeSwitch]
  );

  const setActiveDistrictDirectly = useCallback(
    (id: string | null) => {
      void executeSwitch(id);
    },
    [executeSwitch]
  );

  const confirmDiscard = useCallback(() => {
    if (pendingTransition) {
      const transitionToRun = pendingTransition;
      setPendingTransition(null);
      setDirtySet(new Set());
      transitionToRun();
    }
  }, [pendingTransition]);

  const cancelTransition = useCallback(() => {
    setPendingTransition(null);
  }, []);

  return (
    <DistrictContext.Provider
      value={{
        activeDistrictId,
        switchDistrict,
        setActiveDistrictDirectly,
        registerDirty,
        clearDirty,
        hasDirtyForms,
        pendingTransition,
        confirmDiscard,
        cancelTransition,
        attemptTransition,
      }}
    >
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict(): DistrictContextValue {
  const context = useContext(DistrictContext);
  if (!context) {
    throw new Error('useDistrict must be used within a DistrictProvider');
  }
  return context;
}
