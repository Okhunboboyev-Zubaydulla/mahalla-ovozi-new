import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-context.js';
import { FullPageLoader } from '../components/FullPageLoader.js';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
