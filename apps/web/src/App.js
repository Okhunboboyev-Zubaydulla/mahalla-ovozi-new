import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(AppErrorBoundary, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(ConfigProvider, { theme: mahallaTheme, children: _jsx(AuthProvider, { children: _jsx(DistrictProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/sign-in", element: _jsx(SignInPage, {}) }), _jsx(Route, { path: "/first-login-password-change", element: _jsx(ProtectedRoute, { children: _jsx(FirstSignInPasswordChangePage, {}) }) }), _jsxs(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(ConsoleLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(OverviewPage, {}) }), _jsx(Route, { path: "districts", element: _jsx(DistrictsPage, {}) }), _jsx(Route, { path: "system-health", element: _jsx(SystemHealthPage, {}) }), _jsx(Route, { path: "telegram-setup", element: _jsx(TelegramSetupPage, {}) }), _jsx(Route, { path: "subscriptions", element: _jsx(SubscriptionsPage, {}) }), _jsx(Route, { path: "hokim-accounts", element: _jsx(HokimAccountsPage, {}) }), _jsx(Route, { path: "ai-operations", element: _jsx(AiOperationsPage, {}) }), _jsx(Route, { path: "audit-history", element: _jsx(AuditHistoryPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }) }) }) }) }));
}
export default App;
