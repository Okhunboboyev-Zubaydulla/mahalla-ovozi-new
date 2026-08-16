import { createHash, randomBytes } from "node:crypto";

import type {
  OpaqueSession,
  SessionCrypto,
} from "../../modules/auth/ports.js";

const SESSION_TOKEN_BYTES = 32;

const hashSessionToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

const generateOpaqueSession = (): OpaqueSession => {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");

  return {
    token,
    tokenHash: hashSessionToken(token),
  };
};

export const createOpaqueSessionCrypto = (): SessionCrypto => ({
  generate: generateOpaqueSession,
  hash: hashSessionToken,
});
