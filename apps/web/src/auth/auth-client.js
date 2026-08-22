import { SignInResponseSchema, SessionResponseSchema, SignOutResponseSchema, FirstSignInPasswordChangeResponseSchema, } from '@mahalla-ovozi/api-contracts';
import { request, ApiError } from '../lib/api-client.js';
export { ApiError };
export const authClient = {
    signIn(credentials) {
        return request('/api/v1/auth/sign-in', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }, SignInResponseSchema);
    },
    signOut() {
        return request('/api/v1/auth/sign-out', {
            method: 'POST',
            body: JSON.stringify({}),
        }, SignOutResponseSchema);
    },
    fetchSession() {
        return request('/api/v1/auth/session', {
            method: 'GET',
        }, SessionResponseSchema);
    },
    changeFirstLoginPassword(payload) {
        return request('/api/v1/auth/change-first-login-password', {
            method: 'POST',
            body: JSON.stringify(payload),
        }, FirstSignInPasswordChangeResponseSchema);
    },
};
