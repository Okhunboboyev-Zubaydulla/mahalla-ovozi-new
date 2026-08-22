import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context.js';
import { FullPageLoader } from '../components/FullPageLoader.js';
export function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading, mustChangePassword } = useAuth();
    const location = useLocation();
    if (isLoading) {
        return _jsx(FullPageLoader, {});
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/sign-in", replace: true });
    }
    if (mustChangePassword && location.pathname !== '/first-login-password-change') {
        return _jsx(Navigate, { to: "/first-login-password-change", replace: true });
    }
    if (!mustChangePassword && location.pathname === '/first-login-password-change') {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
