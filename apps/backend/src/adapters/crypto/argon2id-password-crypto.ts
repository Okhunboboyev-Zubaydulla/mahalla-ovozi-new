import argon2 from "argon2";

import type { PasswordCrypto } from "../../modules/auth/ports.js";

const ARGON2_MEMORY_COST_KIB = 19_456;
const ARGON2_TIME_COST = 2;
const ARGON2_PARALLELISM = 1;
const ARGON2_HASH_LENGTH = 32;

export const createArgon2idPasswordCrypto = (): PasswordCrypto => ({
  hash: async (password): Promise<string> =>
    argon2.hash(password, {
      hashLength: ARGON2_HASH_LENGTH,
      memoryCost: ARGON2_MEMORY_COST_KIB,
      parallelism: ARGON2_PARALLELISM,
      timeCost: ARGON2_TIME_COST,
      type: argon2.argon2id,
    }),
  verify: async (passwordHash, password): Promise<boolean> => {
    if (!passwordHash.startsWith("$argon2id$")) {
      return false;
    }

    return argon2.verify(passwordHash, password);
  },
});
