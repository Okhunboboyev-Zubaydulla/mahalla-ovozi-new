import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useRef, } from 'react';
import { useQueryClient } from '@tanstack/react-query';
const DistrictContext = createContext(null);
export function DistrictProvider({ children }) {
    const queryClient = useQueryClient();
    const [activeDistrictId, setActiveDistrictId] = useState(null);
    const [dirtySet, setDirtySet] = useState(new Set());
    const [pendingTransition, setPendingTransition] = useState(null);
    const activeDistrictIdRef = useRef(activeDistrictId);
    activeDistrictIdRef.current = activeDistrictId;
    const hasDirtyForms = dirtySet.size > 0;
    const registerDirty = useCallback((id) => {
        setDirtySet((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);
    const clearDirty = useCallback((id) => {
        setDirtySet((prev) => {
            if (!prev.has(id))
                return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);
    const switchSeqRef = useRef(0);
    // P4-B: Atomic district switch sequence in strict order
    const executeSwitch = useCallback(async (nextId) => {
        const seq = ++switchSeqRef.current;
        const prevId = activeDistrictIdRef.current;
        if (prevId && prevId !== nextId) {
            // 1. Signal abort to in-flight prior-district queries (async — await settlement)
            await queryClient.cancelQueries({ queryKey: ['district', prevId] });
            // 2. Purge prior-district cache (sync — must fire AFTER cancelQueries resolves)
            queryClient.removeQueries({ queryKey: ['district', prevId] });
        }
        // Drop late execution if a newer switch was initiated
        if (seq !== switchSeqRef.current)
            return;
        // 3. Clear local interaction state & dirty registry
        setDirtySet(new Set());
        // 4. Activate new district context
        setActiveDistrictId(nextId);
    }, [queryClient]);
    const attemptTransition = useCallback((action) => {
        if (dirtySet.size > 0) {
            setPendingTransition(() => async () => {
                setDirtySet(new Set());
                await action();
            });
        }
        else {
            void action();
        }
    }, [dirtySet]);
    const switchDistrict = useCallback(async (nextId) => {
        if (nextId === activeDistrictIdRef.current)
            return;
        if (dirtySet.size > 0) {
            setPendingTransition(() => () => {
                void executeSwitch(nextId);
            });
        }
        else {
            await executeSwitch(nextId);
        }
    }, [dirtySet, executeSwitch]);
    const setActiveDistrictDirectly = useCallback((id) => {
        void executeSwitch(id);
    }, [executeSwitch]);
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
    return (_jsx(DistrictContext.Provider, { value: {
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
        }, children: children }));
}
export function useDistrict() {
    const context = useContext(DistrictContext);
    if (!context) {
        throw new Error('useDistrict must be used within a DistrictProvider');
    }
    return context;
}
