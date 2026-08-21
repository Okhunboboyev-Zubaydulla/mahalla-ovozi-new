import { describe, it, expect } from 'vitest';
import { deriveWebhookSecret, verifyTelegramSecretToken } from '../src/modules/telegram-intake/webhook-security.js';

describe('Telegram Webhook Security Utilities', () => {
  const botId = '123456789';

  it('generates consistent HMAC-SHA256 secret for a given botId', () => {
    const secret1 = deriveWebhookSecret(botId);
    const secret2 = deriveWebhookSecret(botId);
    expect(secret1).toBe(secret2);
    expect(typeof secret1).toBe('string');
    expect(secret1.length).toBe(64); // hex-encoded sha256
  });

  it('generates different secrets for different botIds', () => {
    const secret1 = deriveWebhookSecret('111111');
    const secret2 = deriveWebhookSecret('222222');
    expect(secret1).not.toBe(secret2);
  });

  it('validates matching secret token string successfully', () => {
    const secret = deriveWebhookSecret(botId);
    const isValid = verifyTelegramSecretToken(secret, secret);
    expect(isValid).toBe(true);
  });

  it('validates matching secret token passed in an array (Fastify header behavior)', () => {
    const secret = deriveWebhookSecret(botId);
    const isValid = verifyTelegramSecretToken([secret], secret);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or mismatched secret token without throwing', () => {
    const secret = deriveWebhookSecret(botId);
    const invalidSecret = secret.slice(0, -2) + 'aa';
    const isValid = verifyTelegramSecretToken(invalidSecret, secret);
    expect(isValid).toBe(false);
  });

  it('rejects completely different length token without RangeError', () => {
    const secret = deriveWebhookSecret(botId);
    const shortToken = 'short';
    const longToken = secret + 'extra-long-padding-bytes';

    expect(() => verifyTelegramSecretToken(shortToken, secret)).not.toThrow();
    expect(verifyTelegramSecretToken(shortToken, secret)).toBe(false);
    expect(verifyTelegramSecretToken(longToken, secret)).toBe(false);
  });

  it('rejects missing or undefined headers safely', () => {
    const secret = deriveWebhookSecret(botId);
    expect(verifyTelegramSecretToken(undefined, secret)).toBe(false);
    expect(verifyTelegramSecretToken('', secret)).toBe(false);
    expect(verifyTelegramSecretToken([], secret)).toBe(false);
  });
});
