import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  AuthActor,
  AuthSignInRequest,
} from "@mahalla-ovozi/api-contracts";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";

import {
  acknowledgeActivity,
  AuthenticationApiError,
  getSession,
  signIn,
  signOut,
} from "./auth-api.js";

export const protectedQueryRoot = ["protected"] as const;
export const authSessionQueryKey = ["protected", "auth", "session"] as const;

const activityThrottleMilliseconds = 5 * 60 * 1_000;
const inactivityPrivacyMilliseconds = 12 * 60 * 60 * 1_000;

export type AuthenticationStatus =
  | "AUTHENTICATED"
  | "LOADING"
  | "UNAUTHENTICATED"
  | "UNKNOWN";

export type AuthenticationContextValue = Readonly<{
  actor: AuthActor | null;
  authenticate: (credentials: AuthSignInRequest) => Promise<void>;
  authenticationStatus: AuthenticationStatus;
  isReadOnly: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  resetSignInError: () => void;
  retrySession: () => Promise<void>;
  sessionEnded: boolean;
  signInError: AuthenticationApiError | null;
  signOutError: AuthenticationApiError | null;
  signOutNow: () => void;
}>;

const AuthenticationContext = createContext<AuthenticationContextValue | null>(
  null,
);

const isAuthenticationApiError = (
  error: unknown,
): error is AuthenticationApiError => error instanceof AuthenticationApiError;

export const clearProtectedState = async (
  queryClient: QueryClient,
): Promise<void> => {
  await queryClient.cancelQueries(
    { queryKey: protectedQueryRoot },
    { silent: true },
  );
  queryClient.removeQueries({ queryKey: protectedQueryRoot });
};

export const AuthenticationProvider = ({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authoritativelyUnauthenticated, setAuthoritativelyUnauthenticated] =
    useState(false);
  const [authenticationUncertain, setAuthenticationUncertain] = useState(false);
  const [privacyDeadlineAt, setPrivacyDeadlineAt] = useState<number | null>(null);
  const [privacyLocked, setPrivacyLocked] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const activeActorId = useRef<string | null>(null);
  const hadAuthenticatedSession = useRef(false);
  const authLossInProgress = useRef(false);
  const lastActivityAttemptAt = useRef<number | null>(null);

  const sessionQuery = useQuery<AuthActor, AuthenticationApiError>({
    enabled: !authoritativelyUnauthenticated,
    networkMode: "always",
    queryFn: ({ signal }) => getSession(signal),
    queryKey: authSessionQueryKey,
    refetchOnReconnect: true,
    retry: false,
  });
  const sessionActor = sessionQuery.data;
  const sessionError = sessionQuery.error;
  const isSessionPending = sessionQuery.isPending;
  const refetchSession = sessionQuery.refetch;

  const loseAuthentication = useCallback(
    async (showSessionEnded: boolean): Promise<void> => {
      if (authLossInProgress.current) {
        return;
      }
      authLossInProgress.current = true;
      setAuthoritativelyUnauthenticated(true);
      setAuthenticationUncertain(false);
      setPrivacyDeadlineAt(null);
      setPrivacyLocked(false);
      setSessionEnded(showSessionEnded);
      activeActorId.current = null;
      hadAuthenticatedSession.current = false;
      lastActivityAttemptAt.current = null;
      await clearProtectedState(queryClient);
      navigate("/sign-in", { replace: true });
      authLossInProgress.current = false;
    },
    [navigate, queryClient],
  );

  useEffect((): void => {
    if (sessionActor !== undefined) {
      hadAuthenticatedSession.current = true;
      setAuthenticationUncertain(false);
      setAuthoritativelyUnauthenticated(false);
      if (activeActorId.current !== sessionActor.accountId) {
        activeActorId.current = sessionActor.accountId;
        lastActivityAttemptAt.current = null;
        setPrivacyDeadlineAt(Date.now() + inactivityPrivacyMilliseconds);
      }
    }
  }, [sessionActor]);

  useEffect((): void => {
    if (sessionError === null) {
      return;
    }
    if (sessionError.apiCode === "UNAUTHENTICATED") {
      void loseAuthentication(hadAuthenticatedSession.current);
      return;
    }
    setAuthenticationUncertain(true);
  }, [loseAuthentication, sessionError]);

  const activityMutation = useMutation<void, AuthenticationApiError, void>({
    mutationFn: acknowledgeActivity,
    networkMode: "always",
    onError: (error): void => {
      if (error.apiCode === "UNAUTHENTICATED") {
        void loseAuthentication(true);
        return;
      }
      setAuthenticationUncertain(true);
    },
    onSuccess: (): void => {
      setAuthenticationUncertain(false);
      setPrivacyDeadlineAt(Date.now() + inactivityPrivacyMilliseconds);
    },
    retry: false,
  });
  const acknowledgeActivityNow = activityMutation.mutate;
  const isAcknowledgingActivity = activityMutation.isPending;

  useEffect(() => {
    if (
      sessionActor === undefined ||
      authenticationUncertain ||
      privacyLocked
    ) {
      return undefined;
    }
    const acknowledgeGenuineActivity = (): void => {
      const now = Date.now();
      const lastAttempt = lastActivityAttemptAt.current;
      if (
        isAcknowledgingActivity ||
        (lastAttempt !== null &&
          now - lastAttempt < activityThrottleMilliseconds)
      ) {
        return;
      }
      lastActivityAttemptAt.current = now;
      acknowledgeActivityNow();
    };
    window.addEventListener("pointerdown", acknowledgeGenuineActivity, {
      passive: true,
    });
    window.addEventListener("keydown", acknowledgeGenuineActivity);
    return (): void => {
      window.removeEventListener("pointerdown", acknowledgeGenuineActivity);
      window.removeEventListener("keydown", acknowledgeGenuineActivity);
    };
  }, [
    acknowledgeActivityNow,
    authenticationUncertain,
    isAcknowledgingActivity,
    privacyLocked,
    sessionActor,
  ]);

  useEffect(() => {
    if (
      sessionActor === undefined ||
      privacyDeadlineAt === null ||
      privacyLocked
    ) {
      return undefined;
    }
    const timeout = window.setTimeout((): void => {
      setPrivacyLocked(true);
      setAuthenticationUncertain(true);
      void refetchSession().then((result): void => {
        if (result.isSuccess) {
          setAuthenticationUncertain(false);
          setPrivacyLocked(false);
          setPrivacyDeadlineAt(Date.now() + inactivityPrivacyMilliseconds);
        }
      });
    }, Math.max(0, privacyDeadlineAt - Date.now()));
    return (): void => {
      window.clearTimeout(timeout);
    };
  }, [privacyDeadlineAt, privacyLocked, refetchSession, sessionActor]);

  const signInMutation = useMutation<
    AuthActor,
    AuthenticationApiError,
    AuthSignInRequest
  >({
    mutationFn: signIn,
    networkMode: "always",
    onSuccess: (actor): void => {
      setAuthoritativelyUnauthenticated(false);
      setAuthenticationUncertain(false);
      setPrivacyDeadlineAt(Date.now() + inactivityPrivacyMilliseconds);
      setPrivacyLocked(false);
      setSessionEnded(false);
      activeActorId.current = actor.accountId;
      hadAuthenticatedSession.current = true;
      lastActivityAttemptAt.current = null;
      queryClient.setQueryData(authSessionQueryKey, actor);
      navigate("/console", { replace: true });
    },
    retry: false,
  });

  const signOutMutation = useMutation<void, AuthenticationApiError, void>({
    mutationFn: signOut,
    networkMode: "always",
    onError: (): void => {
      setAuthenticationUncertain(true);
    },
    onSuccess: (): void => {
      void loseAuthentication(false);
    },
    retry: false,
  });

  const authenticate = async (
    credentials: AuthSignInRequest,
  ): Promise<void> => {
    await signInMutation.mutateAsync(credentials);
  };

  const signOutNow = (): void => {
    signOutMutation.mutate();
  };

  const retrySession = async (): Promise<void> => {
    const result = await refetchSession();
    if (result.isSuccess) {
      setAuthenticationUncertain(false);
      setPrivacyLocked(false);
      setPrivacyDeadlineAt(Date.now() + inactivityPrivacyMilliseconds);
      return;
    }
    setAuthenticationUncertain(true);
  };

  const actor = sessionActor ?? null;
  let authenticationStatus: AuthenticationStatus;
  if (privacyLocked) {
    authenticationStatus = "UNKNOWN";
  } else if (actor !== null) {
    authenticationStatus = "AUTHENTICATED";
  } else if (authoritativelyUnauthenticated) {
    authenticationStatus = "UNAUTHENTICATED";
  } else if (isSessionPending) {
    authenticationStatus = "LOADING";
  } else {
    authenticationStatus = "UNKNOWN";
  }

  const value: AuthenticationContextValue = {
    actor,
    authenticate,
    authenticationStatus,
    isReadOnly: actor !== null && authenticationUncertain,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    resetSignInError: signInMutation.reset,
    retrySession,
    sessionEnded,
    signInError: isAuthenticationApiError(signInMutation.error)
      ? signInMutation.error
      : null,
    signOutError: isAuthenticationApiError(signOutMutation.error)
      ? signOutMutation.error
      : null,
    signOutNow,
  };

  return (
    <AuthenticationContext.Provider value={value}>
      {children}
    </AuthenticationContext.Provider>
  );
};

export const useAuthentication = (): AuthenticationContextValue => {
  const context = useContext(AuthenticationContext);
  if (context === null) {
    throw new Error("useAuthentication requires AuthenticationProvider.");
  }
  return context;
};
