export type PasswordCrypto = Readonly<{
  hash: (password: string) => Promise<string>;
  verify: (passwordHash: string, password: string) => Promise<boolean>;
}>;

export type OpaqueSession = Readonly<{
  token: string;
  tokenHash: string;
}>;

export type SessionCrypto = Readonly<{
  generate: () => OpaqueSession;
  hash: (token: string) => string;
}>;

export type ProductOwnerProvisionResult = Readonly<{
  accountId: string;
  credentialVersion: number;
  operation: "created" | "reset";
  role: "PRODUCT_OWNER";
  username: string;
}>;

export type ActorContext = Readonly<{
  accountId: string;
  role: "PRODUCT_OWNER";
  username: string;
}>;

export type CredentialSnapshot = ActorContext &
  Readonly<{
    credentialVersion: number;
    passwordHash: string;
  }>;

export type UnauthenticatedAuditEvent = Readonly<{
  eventType: "AUTH_LOGIN_FAILED" | "AUTH_RATE_LIMITED";
  requestId: string;
}>;

export type AuthStore = Readonly<{
  appendUnauthenticatedAuditEvent: (
    event: UnauthenticatedAuditEvent,
  ) => Promise<void>;
  createOrResetProductOwner: (input: Readonly<{
    passwordHash: string;
    username: string;
  }>) => Promise<ProductOwnerProvisionResult>;
  findCredentialSnapshot: (username: string) => Promise<CredentialSnapshot | null>;
  commitAuthenticatedSession: (input: Readonly<{
    accountId: string;
    expectedCredentialVersion: number;
    requestId: string | null;
    tokenHash: string;
  }>) => Promise<ActorContext | null>;
  findSessionActor: (tokenHash: string) => Promise<ActorContext | null>;
  acknowledgeSessionActivity: (tokenHash: string) => Promise<boolean>;
  signOutSession: (input: Readonly<{
    requestId: string | null;
    tokenHash: string;
  }>) => Promise<boolean>;
  revokeSession: (tokenHash: string) => Promise<boolean>;
}>;
