import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mahallaTheme } from './theme/antd-theme.js';
import { AuthProvider } from './auth/auth-context.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { SignInPage } from './pages/SignInPage.js';
import { ProtectedLandingPage } from './pages/ProtectedLandingPage.js';
import { AppErrorBoundary } from './components/AppErrorBoundary.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={mahallaTheme}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/sign-in" element={<SignInPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <ProtectedLandingPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
