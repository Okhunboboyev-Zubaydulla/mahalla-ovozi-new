import {
  canonicalizeUsername,
  CredentialValidationError,
  normalizePasswordForAuthentication,
} from "./credential-policy.js";
import type {
  ActorContext,
  AuthStore,
  PasswordCrypto,
  SessionCrypto,
} from "./ports.js";

export class InvalidCredentialsError extends Error {
  override readonly name = "InvalidCredentialsError";

  constructor() {
    super("The supplied credentials are invalid.");
  }
}

export type AuthService = Readonly<{
  acknowledgeActivity: (token: string) => Promise<boolean>;
  authenticate: (input: Readonly<{
    password: string;
    requestId: string | null;
    username: string;
  }>) => Promise<Readonly<{ actor: ActorContext; token: string }>>;
  getSession: (token: string) => Promise<ActorContext | null>;
  recordLoginFailed: (requestId: string) => Promise<void>;
  recordRateLimited: (requestId: string) => Promise<void>;
  revoke: (token: string) => Promise<boolean>;
  signOut: (token: string, requestId: string | null) => Promise<boolean>;
}>;

export type AuthServiceDependencies = Readonly<{
  authStore: AuthStore;
  dummyPasswordHash: string;
  passwordCrypto: PasswordCrypto;
  sessionCrypto: SessionCrypto;
}>;

const rejectInvalidCredentialShape = async (
  password: string,
  dependencies: AuthServiceDependencies,
): Promise<never> => {
  await dependencies.passwordCrypto.verify(
    dependencies.dummyPasswordHash,
    password.normalize("NFC"),
  );
  throw new InvalidCredentialsError();
};

const authenticate = async (
  input: Readonly<{
    password: string;
    requestId: string | null;
    username: string;
  }>,
  dependencies: AuthServiceDependencies,
): Promise<Readonly<{ actor: ActorContext; token: string }>> => {
  let username: string;
  let password: string;

  try {
    username = canonicalizeUsername(input.username);
    password = normalizePasswordForAuthentication(input.password);
  } catch (error) {
    if (error instanceof CredentialValidationError) {
      return rejectInvalidCredentialShape(input.password, dependencies);
    }
    throw error;
  }

  const credentialSnapshot =
    await dependencies.authStore.findCredentialSnapshot(username);
  const passwordHash =
    credentialSnapshot?.passwordHash ?? dependencies.dummyPasswordHash;
  const passwordMatches = await dependencies.passwordCrypto.verify(
    passwordHash,
    password,
  );

  if (credentialSnapshot === null || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const session = dependencies.sessionCrypto.generate();
  const actor = await dependencies.authStore.commitAuthenticatedSession({
    accountId: credentialSnapshot.accountId,
    expectedCredentialVersion: credentialSnapshot.credentialVersion,
    requestId: input.requestId,
    tokenHash: session.tokenHash,
  });

  if (actor === null) {
    throw new InvalidCredentialsError();
  }

  return { actor, token: session.token };
};

export const createAuthService = (
  dependencies: AuthServiceDependencies,
): AuthService => ({
  acknowledgeActivity: async (token): Promise<boolean> =>
    dependencies.authStore.acknowledgeSessionActivity(
      dependencies.sessionCrypto.hash(token),
    ),
  authenticate: async (input): Promise<Readonly<{
    actor: ActorContext;
    token: string;
  }>> => authenticate(input, dependencies),
  getSession: async (token): Promise<ActorContext | null> =>
    dependencies.authStore.findSessionActor(
      dependencies.sessionCrypto.hash(token),
    ),
  recordLoginFailed: async (requestId): Promise<void> =>
    dependencies.authStore.appendUnauthenticatedAuditEvent({
      eventType: "AUTH_LOGIN_FAILED",
      requestId,
    }),
  recordRateLimited: async (requestId): Promise<void> =>
    dependencies.authStore.appendUnauthenticatedAuditEvent({
      eventType: "AUTH_RATE_LIMITED",
      requestId,
    }),
  revoke: async (token): Promise<boolean> =>
    dependencies.authStore.revokeSession(
      dependencies.sessionCrypto.hash(token),
    ),
  signOut: async (token, requestId): Promise<boolean> =>
    dependencies.authStore.signOutSession({
      requestId,
      tokenHash: dependencies.sessionCrypto.hash(token),
    }),
});
