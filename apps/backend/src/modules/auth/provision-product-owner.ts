import {
  canonicalizeUsername,
  normalizeAndValidatePassword,
} from "./credential-policy.js";
import type {
  AuthStore,
  PasswordCrypto,
  ProductOwnerProvisionResult,
} from "./ports.js";

export type ProductOwnerProvisionDependencies = Readonly<{
  authStore: AuthStore;
  passwordCrypto: PasswordCrypto;
}>;

export const provisionProductOwner = async (
  input: Readonly<{ password: string; username: string }>,
  dependencies: ProductOwnerProvisionDependencies,
): Promise<ProductOwnerProvisionResult> => {
  const username = canonicalizeUsername(input.username);
  const password = normalizeAndValidatePassword(input.password);
  const passwordHash = await dependencies.passwordCrypto.hash(password);

  return dependencies.authStore.createOrResetProductOwner({
    passwordHash,
    username,
  });
};
