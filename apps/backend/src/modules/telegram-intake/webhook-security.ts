import crypto from 'node:crypto';
import { getEncryptionKey } from '../../adapters/crypto/token-cipher.js';

/**
 * Derives a deterministic webhook secret token for a specific botId using HMAC-SHA256
 * keyed with the application's master encryption key.
 */
export function deriveWebhookSecret(botId: string): string {
  if (!botId || typeof botId !== 'string') {
    return '';
  }
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(botId).digest('hex');
}

/**
 * Verifies an incoming X-Telegram-Bot-Api-Secret-Token header against the expected secret.
 * Computes the SHA-256 hash of both inputs before calling crypto.timingSafeEqual to:
 * 1. Ensure constant-length 32-byte buffers, preventing RangeError length mismatch exceptions.
 * 2. Prevent side-channel timing attacks that could reveal secret length or character prefixes.
 */
export function verifyTelegramSecretToken(
  incomingHeader: string | string[] | undefined,
  expectedSecret: string,
): boolean {
  if (!incomingHeader || !expectedSecret || typeof expectedSecret !== 'string') {
    return false;
  }
  const token = Array.isArray(incomingHeader) ? incomingHeader[0] : incomingHeader;
  if (!token || typeof token !== 'string') {
    return false;
  }

  const expectedHash = crypto.createHash('sha256').update(expectedSecret, 'utf8').digest();
  const receivedHash = crypto.createHash('sha256').update(token, 'utf8').digest();

  return crypto.timingSafeEqual(expectedHash, receivedHash);
}
