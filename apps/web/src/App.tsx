import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mahallaTheme } from './theme/antd-theme.js';
import { AuthProvider } from './auth/auth-context.js';
import { DistrictProvider } from './district/district-context.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { SignInPage } from './pages/SignInPage.js';
import { ConsoleLayout } from './components/ConsoleLayout.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { DistrictsPage } from './pages/DistrictsPage.js';
import { SystemHealthPage } from './pages/placeholders/SystemHealthPage.js';
import { TelegramSetupPage } from './pages/TelegramSetupPage.js';
import { SubscriptionsPage } from './pages/placeholders/SubscriptionsPage.js';
import { HokimAccountsPage } from './pages/HokimAccountsPage.js';
import { AiOperationsPage } from './pages/placeholders/AiOperationsPage.js';
import { AuditHistoryPage } from './pages/placeholders/AuditHistoryPage.js';
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
            {/* P4-E: DistrictProvider inside AuthProvider & QueryClientProvider */}
            <DistrictProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/sign-in" element={<SignInPage />} />
                  
                  {/* P4-F: React Router 7 nested layout route with Outlet */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <ConsoleLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<OverviewPage />} />
                    <Route path="districts" element={<DistrictsPage />} />
                    <Route path="system-health" element={<SystemHealthPage />} />
                    <Route path="telegram-setup" element={<TelegramSetupPage />} />
                    <Route path="subscriptions" element={<SubscriptionsPage />} />
                    <Route path="hokim-accounts" element={<HokimAccountsPage />} />
                    <Route path="ai-operations" element={<AiOperationsPage />} />
                    <Route path="audit-history" element={<AuditHistoryPage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </DistrictProvider>
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
