import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActorContext, SignInRequest, SignInResponse } from '@mahalla-ovozi/api-contracts';
import { authClient } from './auth-client.js';

interface AuthContextValue {
  actor: ActorContext | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: SignInRequest) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  isSigningIn: boolean;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: () => authClient.fetchSession(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const signInMutation = useMutation({
    mutationFn: (credentials: SignInRequest) => authClient.signIn(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'session'], data);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'session'], null);
      queryClient.removeQueries({ queryKey: ['auth', 'session'] });
    },
  });

  const signIn = async (credentials: SignInRequest) => {
    return await signInMutation.mutateAsync(credentials);
  };

  const signOut = async () => {
    queryClient.setQueryData(['auth', 'session'], null);
    try {
      await authClient.signOut();
    } catch {
      // ignore
    } finally {
      queryClient.removeQueries({ queryKey: ['auth', 'session'] });
    }
  };

  const actor = sessionData?.actor || null;
  const isAuthenticated = !!actor;

  return (
    <AuthContext.Provider
      value={{
        actor,
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
        isSigningIn: signInMutation.isPending,
        isSigningOut: signOutMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
