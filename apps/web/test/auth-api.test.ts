import { afterEach, describe, expect, test, vi } from "vitest";

import {
  AuthenticationApiError,
  acknowledgeActivity,
  getSession,
  signIn,
  signOut,
} from "../src/auth/auth-api.js";

const actor = {
  accountId: "account-1",
  role: "PRODUCT_OWNER",
  username: "product-owner",
} as const;

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe("authentication API", () => {
  test("bootstraps the session through a cancellable same-origin request", async () => {
    const signal = new AbortController().signal;
    const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(actor, 200),
    );
    vi.stubGlobal("fetch", fetchStub);

    await expect(getSession(signal)).resolves.toEqual(actor);
    expect(fetchStub).toHaveBeenCalledWith("/api/v1/auth/session", {
      credentials: "same-origin",
      method: "GET",
      signal,
    });
  });

  test("sends sign-in credentials once and returns only the validated actor", async () => {
    const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(actor, 200),
    );
    vi.stubGlobal("fetch", fetchStub);

    await expect(
      signIn({ password: "correct horse battery staple", username: " owner " }),
    ).resolves.toEqual(actor);
    expect(fetchStub).toHaveBeenCalledWith("/api/v1/auth/sign-in", {
      body: JSON.stringify({
        password: "correct horse battery staple",
        username: " owner ",
      }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  test("preserves the sanitized invalid-credential contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Нотўғри фойдаланувчи номи ёки парол.",
            },
          },
          401,
        ),
      ),
    );

    const request = signIn({
      password: "wrong password value",
      username: "product-owner",
    });

    await expect(request).rejects.toMatchObject({
      apiCode: "INVALID_CREDENTIALS",
      category: "API",
      message: "Нотўғри фойдаланувчи номи ёки парол.",
      statusCode: 401,
    });
  });

  test("classifies an unreachable server as network uncertainty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")),
    );

    const request = getSession(new AbortController().signal);

    await expect(request).rejects.toEqual(
      new AuthenticationApiError(
        "NETWORK",
        null,
        null,
        "Сервер билан боғланиб бўлмади.",
      ),
    );
  });

  test("rejects malformed success data without exposing the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ passwordHash: "must-not-escape" }, 200),
      ),
    );

    const request = getSession(new AbortController().signal);

    await expect(request).rejects.toEqual(
      new AuthenticationApiError(
        "INVALID_RESPONSE",
        null,
        200,
        "Сервердан нотўғри жавоб олинди.",
      ),
    );
  });

  test("sends bodyless authentication mutations without replay metadata", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchStub);

    await signOut();
    await acknowledgeActivity();

    expect(fetchStub.mock.calls).toEqual([
      [
        "/api/v1/auth/sign-out",
        { credentials: "same-origin", method: "POST" },
      ],
      [
        "/api/v1/auth/activity",
        { credentials: "same-origin", method: "POST" },
      ],
    ]);
  });
});
