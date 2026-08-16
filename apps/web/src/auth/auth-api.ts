import {
  apiErrorSchema,
  authActorSchema,
  type ApiErrorCode,
  type AuthActor,
  type AuthSignInRequest,
} from "@mahalla-ovozi/api-contracts";

export type AuthenticationApiErrorCategory =
  | "API"
  | "INVALID_RESPONSE"
  | "NETWORK";

export class AuthenticationApiError extends Error {
  override readonly name = "AuthenticationApiError";
  readonly apiCode: ApiErrorCode | null;
  readonly category: AuthenticationApiErrorCategory;
  readonly statusCode: number | null;

  constructor(
    category: AuthenticationApiErrorCategory,
    apiCode: ApiErrorCode | null,
    statusCode: number | null,
    message: string,
  ) {
    super(message);
    this.apiCode = apiCode;
    this.category = category;
    this.statusCode = statusCode;
  }
}

const invalidResponseError = (statusCode: number): AuthenticationApiError =>
  new AuthenticationApiError(
    "INVALID_RESPONSE",
    null,
    statusCode,
    "Сервердан нотўғри жавоб олинди.",
  );

const request = async (url: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    if (!(error instanceof TypeError)) {
      throw error;
    }
    throw new AuthenticationApiError(
      "NETWORK",
      null,
      null,
      "Сервер билан боғланиб бўлмади.",
    );
  }
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw invalidResponseError(response.status);
  }
};

const readApiError = async (
  response: Response,
): Promise<AuthenticationApiError> => {
  const parsedError = apiErrorSchema.safeParse(await readJson(response));
  if (!parsedError.success) {
    return invalidResponseError(response.status);
  }
  return new AuthenticationApiError(
    "API",
    parsedError.data.error.code,
    response.status,
    parsedError.data.error.message,
  );
};

const readActor = async (response: Response): Promise<AuthActor> => {
  if (!response.ok) {
    throw await readApiError(response);
  }
  const parsedActor = authActorSchema.safeParse(await readJson(response));
  if (!parsedActor.success) {
    throw invalidResponseError(response.status);
  }
  return parsedActor.data;
};

const expectNoContent = async (response: Response): Promise<void> => {
  if (!response.ok) {
    throw await readApiError(response);
  }
  if (response.status !== 204) {
    throw invalidResponseError(response.status);
  }
};

export const getSession = async (signal: AbortSignal): Promise<AuthActor> =>
  readActor(
    await request("/api/v1/auth/session", {
      credentials: "same-origin",
      method: "GET",
      signal,
    }),
  );

export const signIn = async (
  credentials: AuthSignInRequest,
): Promise<AuthActor> =>
  readActor(
    await request("/api/v1/auth/sign-in", {
      body: JSON.stringify(credentials),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );

export const signOut = async (): Promise<void> =>
  expectNoContent(
    await request("/api/v1/auth/sign-out", {
      credentials: "same-origin",
      method: "POST",
    }),
  );

export const acknowledgeActivity = async (): Promise<void> =>
  expectNoContent(
    await request("/api/v1/auth/activity", {
      credentials: "same-origin",
      method: "POST",
    }),
  );
