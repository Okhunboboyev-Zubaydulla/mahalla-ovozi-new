import { describe, it, expect } from 'vitest';
import {
  SignInRequestSchema,
  SignInResponseSchema,
  SessionResponseSchema,
  SignOutResponseSchema,
  ApiErrorEnvelopeSchema,
  ActorContextSchema,
} from '../src/index.js';

describe('Auth API Contracts', () => {
  describe('SignInRequestSchema', () => {
    it('accepts valid credentials with at least 15 char password', () => {
      const validPayload = {
        username: 'product_owner',
        password: 'correct horse battery staple 123',
      };
      const result = SignInRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('product_owner');
        expect(result.data.password).toBe('correct horse battery staple 123');
      }
    });

    it('rejects passwords shorter than 15 characters', () => {
      const shortPayload = {
        username: 'product_owner',
        password: 'short_pass',
      };
      const result = SignInRequestSchema.safeParse(shortPayload);
      expect(result.success).toBe(false);
    });

    it('rejects passwords longer than 128 characters', () => {
      const longPayload = {
        username: 'product_owner',
        password: 'a'.repeat(129),
      };
      const result = SignInRequestSchema.safeParse(longPayload);
      expect(result.success).toBe(false);
    });

    it('rejects empty or short usernames', () => {
      const invalidPayload = {
        username: 'po',
        password: 'valid_length_password_12345',
      };
      const result = SignInRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('SignInResponseSchema & SessionResponseSchema', () => {
    it('validates a valid Product Owner sign-in response', () => {
      const response = {
        actor: {
          id: 'acc_01h8abc123',
          role: 'PRODUCT_OWNER',
          username: 'po_admin',
        },
        session: {
          expiresAt: '2026-08-18T00:00:00.000Z',
        },
      };

      const signInResult = SignInResponseSchema.safeParse(response);
      const sessionResult = SessionResponseSchema.safeParse(response);

      expect(signInResult.success).toBe(true);
      expect(sessionResult.success).toBe(true);
    });

    it('validates ActorContextSchema role constraints', () => {
      const actor = {
        id: 'acc_1',
        role: 'PRODUCT_OWNER',
        username: 'po',
      };
      expect(ActorContextSchema.safeParse(actor).success).toBe(true);

      const invalidRoleActor = {
        id: 'acc_1',
        role: 'SUPERADMIN',
        username: 'po',
      };
      expect(ActorContextSchema.safeParse(invalidRoleActor).success).toBe(false);
    });
  });

  describe('SignOutResponseSchema', () => {
    it('validates a successful sign-out response', () => {
      const result = SignOutResponseSchema.safeParse({ success: true });
      expect(result.success).toBe(true);
    });
  });

  describe('ApiErrorEnvelopeSchema', () => {
    it('validates standard sanitized error envelopes', () => {
      const errorPayload = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Нотўғри фойдаланувчи номи ёки парол.',
        },
      };
      const result = ApiErrorEnvelopeSchema.safeParse(errorPayload);
      expect(result.success).toBe(true);
    });

    it('validates error envelopes with statusCode and structured validationErrors', () => {
      const errorPayload = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Киритилган маълумотларда хатолик бор.',
          statusCode: 400,
          validationErrors: [
            { path: ['username'], message: 'Фойдаланувчи номи камида 3 та белги бўлиши керак.', code: 'too_small' },
            { path: ['password'], message: 'Парол камида 15 та белги бўлиши керак.' },
          ],
        },
      };
      const result = ApiErrorEnvelopeSchema.safeParse(errorPayload);
      expect(result.success).toBe(true);
    });

    it('rejects error envelopes missing code or message', () => {
      expect(ApiErrorEnvelopeSchema.safeParse({ error: { message: 'Failed' } }).success).toBe(false);
      expect(ApiErrorEnvelopeSchema.safeParse({ error: { code: 'FAIL' } }).success).toBe(false);
    });
  });
});
