import { describe, expect, test } from "vitest";

import {
  canonicalizeUsername,
  normalizeAndValidatePassword,
  normalizePasswordForAuthentication,
} from "../../src/modules/auth/credential-policy.js";
import { createArgon2idPasswordCrypto } from "../../src/adapters/crypto/argon2id-password-crypto.js";
import { createOpaqueSessionCrypto } from "../../src/adapters/crypto/opaque-session-crypto.js";

describe("Story 1.1 auth-core credential policy", () => {
  test("canonicalizes usernames without changing their case", (): void => {
    expect(canonicalizeUsername("  O\u0308Owner  ")).toBe("ÖOwner");
  });

  test("preserves password whitespace while applying NFC", (): void => {
    expect(normalizeAndValidatePassword("  O\u0308ta maxfiy parol  ")).toBe(
      "  Öta maxfiy parol  ",
    );
  });

  test.each(["short password", "x".repeat(129)])(
    "rejects a password outside the 15-128 code-point boundary",
    (password): void => {
      expect(() => normalizeAndValidatePassword(password)).toThrow(
        "Password must contain 15 to 128 Unicode code points.",
      );
    },
  );

  test.each(["passwordpassword", "123456789012345"])(
    "rejects a locally blocked common password",
    (password): void => {
      expect(() => normalizeAndValidatePassword(password)).toThrow(
        "Password is present in the local compromised-password blocklist.",
      );
    },
  );

  test("keeps common-password screening out of the authentication verifier path", (): void => {
    expect(normalizePasswordForAuthentication("passwordpassword")).toBe(
      "passwordpassword",
    );
  });
});

describe("Story 1.1 Argon2id password storage", () => {
  test("hashes and verifies credentials with the production Argon2id parameters", async (): Promise<void> => {
    const passwordCrypto = createArgon2idPasswordCrypto();
    const password = "  Ўта махфий парол  ";

    const passwordHash = await passwordCrypto.hash(password);

    expect(passwordHash).toMatch(/^\$argon2id\$v=19\$/);
    expect(passwordHash).toContain("m=19456");
    expect(passwordHash).toContain("t=2");
    expect(passwordHash).toContain("p=1");
    await expect(passwordCrypto.verify(passwordHash, password)).resolves.toBe(
      true,
    );
    await expect(
      passwordCrypto.verify(passwordHash, "  Нотўғри махфий парол  "),
    ).resolves.toBe(false);
  });
});

describe("Story 1.1 opaque session tokens", () => {
  test("generates 32 random bytes and exposes only a deterministic SHA-256 hash for storage", (): void => {
    const sessionCrypto = createOpaqueSessionCrypto();

    const first = sessionCrypto.generate();
    const second = sessionCrypto.generate();

    expect(Buffer.from(first.token, "base64url")).toHaveLength(32);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionCrypto.hash(first.token)).toBe(first.tokenHash);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});
