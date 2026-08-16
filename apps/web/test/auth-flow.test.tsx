import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  applicationRoutes,
  createAuthenticationQueryClient,
} from "../src/app/application.js";

const actor = {
  accountId: "account-1",
  role: "PRODUCT_OWNER",
  username: "product-owner",
} as const;

const apiResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const apiErrorResponse = (
  code:
    | "INTERNAL_ERROR"
    | "INVALID_CREDENTIALS"
    | "RATE_LIMITED"
    | "UNAUTHENTICATED",
  message: string,
  status: number,
): Response => apiResponse({ error: { code, message } }, status);

const unauthenticatedResponse = (): Response =>
  apiErrorResponse("UNAUTHENTICATED", "Тизимга кириш талаб қилинади.", 401);

const renderApplication = (path: string, fetchStub: typeof fetch) => {
  vi.stubGlobal("fetch", fetchStub);
  const queryClient = createAuthenticationQueryClient();
  const router = createMemoryRouter(applicationRoutes, {
    initialEntries: [path],
  });
  render(
    <ConfigProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>,
  );
  return { queryClient, router };
};

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("frontend authentication flow", () => {
  test("shows only the required accessible Uzbek Cyrillic sign-in controls", async () => {
    renderApplication(
      "/sign-in",
      vi.fn<typeof fetch>().mockResolvedValue(unauthenticatedResponse()),
    );

    const username = await screen.findByLabelText("Фойдаланувчи номи");
    const password = screen.getByLabelText("Парол");

    expect(username.getAttribute("autocomplete")).toBe("username");
    expect(password.getAttribute("type")).toBe("password");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Кириш",
    ]);
    expect(screen.queryByText(/рўйхатдан ўтиш/i)).toBeNull();
    expect(screen.queryByText(/^Рол$/i)).toBeNull();
  });

  test("hides protected content when initial session authority is unavailable", async () => {
    renderApplication(
      "/console",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")),
    );

    expect(
      await screen.findByText(
        "Сервер билан боғланиб бўлмади. Интернет алоқасини текшириб, қайта урининг.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Маҳсулот эгаси консоли")).toBeNull();
    expect(screen.getByRole("button", { name: "Қайта уриниш" })).toBeTruthy();
  });

  test("signs in once, stores no browser credential state, and replace-navigates to console", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthenticatedResponse())
      .mockResolvedValueOnce(apiResponse(actor, 200));
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const { router } = renderApplication("/sign-in", fetchStub);
    const user = userEvent.setup();
    const username = await screen.findByLabelText("Фойдаланувчи номи");
    const password = screen.getByLabelText("Парол");

    await user.type(username, "product-owner");
    await user.type(password, "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Кириш" }));

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/console");
    expect(storageSpy).not.toHaveBeenCalled();
    expect(
      fetchStub.mock.calls.filter(([url]) => url === "/api/v1/auth/sign-in"),
    ).toHaveLength(1);
  });

  test("retains username, clears password, and shows the exact generic invalid-credential error", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthenticatedResponse())
      .mockResolvedValueOnce(
        apiErrorResponse(
          "INVALID_CREDENTIALS",
          "Нотўғри фойдаланувчи номи ёки парол.",
          401,
        ),
      );
    renderApplication("/sign-in", fetchStub);
    const user = userEvent.setup();
    const username = (await screen.findByLabelText(
      "Фойдаланувчи номи",
    )) as HTMLInputElement;
    const password = screen.getByLabelText("Парол") as HTMLInputElement;

    await user.type(username, "product-owner");
    await user.type(password, "wrong password value");
    await user.click(screen.getByRole("button", { name: "Кириш" }));

    expect(
      await screen.findByText("Нотўғри фойдаланувчи номи ёки парол."),
    ).toBeTruthy();
    expect(username.value).toBe("product-owner");
    expect(password.value).toBe("");
  });

  test("keeps rate limiting distinct from invalid credentials", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthenticatedResponse())
      .mockResolvedValueOnce(
        apiErrorResponse(
          "RATE_LIMITED",
          "Жуда кўп уриниш. Кейинроқ қайта уриниб кўринг.",
          429,
        ),
      );
    renderApplication("/sign-in", fetchStub);
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText("Фойдаланувчи номи"),
      "product-owner",
    );
    await user.type(screen.getByLabelText("Парол"), "wrong password value");
    await user.click(screen.getByRole("button", { name: "Кириш" }));

    expect(
      await screen.findByText("Жуда кўп уриниш. Кейинроқ қайта уриниб кўринг."),
    ).toBeTruthy();
    expect(screen.queryByText("Нотўғри фойдаланувчи номи ёки парол.")).toBeNull();
  });

  test("keeps server failure distinct from credential failure", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthenticatedResponse())
      .mockResolvedValueOnce(
        apiErrorResponse("INTERNAL_ERROR", "Ички сервер хатоси.", 500),
      );
    renderApplication("/sign-in", fetchStub);
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText("Фойдаланувчи номи"),
      "product-owner",
    );
    await user.type(screen.getByLabelText("Парол"), "password long enough");
    await user.click(screen.getByRole("button", { name: "Кириш" }));

    expect(
      await screen.findByText("Серверда ички хато юз берди. Қайта уриниб кўринг."),
    ).toBeTruthy();
    expect(screen.queryByText("Нотўғри фойдаланувчи номи ёки парол.")).toBeNull();
  });

  test("fails an offline sign-in now without reconnect replay", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthenticatedResponse())
      .mockRejectedValueOnce(new TypeError("offline"));
    renderApplication("/sign-in", fetchStub);
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText("Фойдаланувчи номи"),
      "product-owner",
    );
    await user.type(screen.getByLabelText("Парол"), "password long enough");
    await user.click(screen.getByRole("button", { name: "Кириш" }));

    expect(
      await screen.findByText(
        "Сервер билан боғланиб бўлмади. Интернет алоқасини текшириб, қайта урининг.",
      ),
    ).toBeTruthy();
    window.dispatchEvent(new Event("online"));
    expect(
      fetchStub.mock.calls.filter(([url]) => url === "/api/v1/auth/sign-in"),
    ).toHaveLength(1);
  });

  test("blocks duplicate submission while sign-in is pending", async () => {
    let resolveSignIn: ((response: Response) => void) | undefined;
    const pendingSignIn = new Promise<Response>((resolve) => {
      resolveSignIn = resolve;
    });
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthenticatedResponse())
      .mockReturnValueOnce(pendingSignIn);
    renderApplication("/sign-in", fetchStub);
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText("Фойдаланувчи номи"),
      "product-owner",
    );
    await user.type(screen.getByLabelText("Парол"), "password long enough");
    const submit = screen.getByRole("button", { name: "Кириш" });
    await user.click(submit);

    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(submit);
    expect(
      fetchStub.mock.calls.filter(([url]) => url === "/api/v1/auth/sign-in"),
    ).toHaveLength(1);
    resolveSignIn?.(apiResponse(actor, 200));
    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
  });

  test("preserves authorized content read-only during transient uncertainty", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(apiResponse(actor, 200))
      .mockRejectedValueOnce(new TypeError("offline"));
    const { queryClient } = renderApplication("/console", fetchStub);

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    await queryClient.invalidateQueries({
      queryKey: ["protected", "auth", "session"],
    });

    expect(
      await screen.findByText(
        "Алоқа вақтинча мавжуд эмас. Аввал юкланган маълумотлар фақат ўқиш учун қолди.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Маҳсулот эгаси консоли")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Чиқиш" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  test("authoritative authentication loss purges protected state and redirects", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(apiResponse(actor, 200))
      .mockResolvedValueOnce(unauthenticatedResponse());
    const { queryClient, router } = renderApplication("/console", fetchStub);

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    queryClient.setQueryData(["protected", "console", "secret"], "secret");
    await queryClient.invalidateQueries({
      queryKey: ["protected", "auth", "session"],
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/sign-in");
    });
    expect(queryClient.getQueryData(["protected", "console", "secret"])).toBeUndefined();
    expect(screen.queryByText("Маҳсулот эгаси консоли")).toBeNull();
    expect(await screen.findByText("Сеанс тугади. Қайта киринг.")).toBeTruthy();
  });

  test("clears protected state and replace-navigates only after confirmed sign-out", async () => {
    const fetchStub = vi.fn<typeof fetch>(async (input) => {
      const url = input.toString();
      if (url === "/api/v1/auth/session") {
        return apiResponse(actor, 200);
      }
      return new Response(null, { status: 204 });
    });
    const { queryClient, router } = renderApplication("/console", fetchStub);
    const user = userEvent.setup();

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    queryClient.setQueryData(["protected", "console", "secret"], "secret");
    await user.click(screen.getByRole("button", { name: "Чиқиш" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/sign-in");
    });
    expect(queryClient.getQueryData(["protected", "console", "secret"])).toBeUndefined();
    expect(screen.queryByText("Сеанс тугади. Қайта киринг.")).toBeNull();
    expect(
      fetchStub.mock.calls.filter(([url]) => url === "/api/v1/auth/sign-out"),
    ).toHaveLength(1);
  });

  test("does not claim or replay sign-out when the server cannot be reached", async () => {
    const fetchStub = vi.fn<typeof fetch>(async (input) => {
      const url = input.toString();
      if (url === "/api/v1/auth/session") {
        return apiResponse(actor, 200);
      }
      if (url === "/api/v1/auth/activity") {
        return new Response(null, { status: 204 });
      }
      if (url === "/api/v1/auth/sign-out") {
        throw new TypeError("offline");
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const { router } = renderApplication("/console", fetchStub);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Чиқиш" }));

    expect(
      await screen.findByText(
        "Чиқиш тасдиқланмади. Сервер билан алоқани текшириб, қайта урининг.",
      ),
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe("/console");
    window.dispatchEvent(new Event("online"));
    await waitFor(() => {
      expect(
        fetchStub.mock.calls.filter(
          ([url]) => url === "/api/v1/auth/sign-out",
        ),
      ).toHaveLength(1);
    });
  });
});
