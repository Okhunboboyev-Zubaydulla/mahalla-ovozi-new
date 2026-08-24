import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mahallaTheme } from './theme/antd-theme.js';
import { AuthProvider } from './auth/auth-context.js';
import { DistrictProvider } from './district/district-context.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { SignInPage } from './pages/SignInPage.js';
import { FirstSignInPasswordChangePage } from './pages/FirstSignInPasswordChangePage.js';
import { ConsoleLayout } from './components/ConsoleLayout.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { DistrictsPage } from './pages/DistrictsPage.js';
import { SystemHealthPage } from './pages/placeholders/SystemHealthPage.js';
import { TelegramSetupPage } from './pages/TelegramSetupPage.js';
import { SubscriptionsPage } from './pages/placeholders/SubscriptionsPage.js';
import { HokimAccountsPage } from './pages/HokimAccountsPage.js';
import { AiOperationsPage } from './pages/placeholders/AiOperationsPage.js';
import { AuditHistoryPage } from './pages/placeholders/AuditHistoryPage.js';
import { HokimDashboardPage } from './pages/HokimDashboardPage.js';
import { TopicEvidencePage } from './pages/TopicEvidencePage.js';
import { DashboardHelpPage } from './pages/DashboardHelpPage.js';
import { LiveAnnouncerProvider } from './components/topics/LiveRegionAnnouncer.js';
import { AppErrorBoundary } from './components/AppErrorBoundary.js';
import { useAuth } from './auth/auth-context.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedRoot() {
  const { actor } = useAuth();
  if (actor?.role === 'DISTRICT_HOKIM') {
    return <HokimDashboardPage />;
  }
  return <ConsoleLayout />;
}

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={mahallaTheme}>
          <AuthProvider>
            {/* P4-E: DistrictProvider inside AuthProvider & QueryClientProvider */}
            <DistrictProvider>
              <LiveAnnouncerProvider>
                <BrowserRouter>
                  <Routes>
                  <Route path="/sign-in" element={<SignInPage />} />
                  <Route
                    path="/first-login-password-change"
                    element={
                      <ProtectedRoute>
                        <FirstSignInPasswordChangePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Narrow-screen routed Topic Evidence Page for Hokim (AC 8) */}
                  <Route
                    path="/topics/:topicId/evidence"
                    element={
                      <ProtectedRoute>
                        <TopicEvidencePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Narrow-screen routed Help Page for Hokim (AC 4) */}
                  <Route
                    path="/help"
                    element={
                      <ProtectedRoute>
                        <DashboardHelpPage />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Role-discriminating root route: DISTRICT_HOKIM gets HokimDashboardPage directly; PRODUCT_OWNER gets ConsoleLayout */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AuthenticatedRoot />
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
            </LiveAnnouncerProvider>
          </DistrictProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
  );
}

export default App;

