import {
  SignInRequest,
  SignInResponse,
  SessionResponse,
  SignOutResponse,
  SignInResponseSchema,
  SessionResponseSchema,
  SignOutResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request, ApiError } from '../lib/api-client.js';

export { ApiError };

export const authClient = {
  signIn(credentials: SignInRequest): Promise<SignInResponse> {
    return request<SignInResponse>(
      '/api/v1/auth/sign-in',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
      SignInResponseSchema
    );
  },

  signOut(): Promise<SignOutResponse> {
    return request<SignOutResponse>(
      '/api/v1/auth/sign-out',
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      SignOutResponseSchema
    );
  },

  fetchSession(): Promise<SessionResponse> {
    return request<SessionResponse>(
      '/api/v1/auth/session',
      {
        method: 'GET',
      },
      SessionResponseSchema
    );
  },
};
