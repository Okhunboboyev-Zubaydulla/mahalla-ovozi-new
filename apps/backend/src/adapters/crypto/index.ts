import { hashPassword, verifyPassword, ARGON2_CONFIG } from './argon2.js';
import { validatePassword } from './password-policy.js';
import {
  generateTemporaryPassword,
  UNAMBIGUOUS_ALPHABET,
  DEFAULT_TEMPORARY_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from './temporary-password.js';
import { COMMON_PASSWORDS_BLOCKLIST } from './common-passwords.js';
import {
  encryptToken,
  decryptToken,
  maskBotToken,
  getEncryptionKey,
  FALLBACK_DEV_KEY,
} from './token-cipher.js';

export * from './argon2.js';
export * from './password-policy.js';
export * from './temporary-password.js';
export * from './common-passwords.js';
export * from './token-cipher.js';

/**
 * Unified Cryptographic Services Facade for Mahalla Ovozi backend.
 */
export const cryptoService = {
  passwords: {
    hash: hashPassword,
    verify: verifyPassword,
    validate: validatePassword,
    validatePolicy: validatePassword,
    generateTemporary: generateTemporaryPassword,
    argon2Config: ARGON2_CONFIG,
    unambiguousAlphabet: UNAMBIGUOUS_ALPHABET,
    commonBlocklist: COMMON_PASSWORDS_BLOCKLIST,
    defaultLength: DEFAULT_TEMPORARY_PASSWORD_LENGTH,
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
  },
  tokens: {
    encrypt: encryptToken,
    decrypt: decryptToken,
    mask: maskBotToken,
    getKey: getEncryptionKey,
    fallbackDevKey: FALLBACK_DEV_KEY,
  },
};

export type CryptoService = typeof cryptoService;
