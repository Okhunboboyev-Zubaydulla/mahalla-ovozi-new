import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const unauthenticatedResponse = (): Response =>
  apiResponse(
    {
      error: {
        code: "UNAUTHENTICATED",
        message: "Тизимга кириш талаб қилинади.",
      },
    },
    401,
  );

const renderConsole = (fetchStub: typeof fetch) => {
  vi.stubGlobal("fetch", fetchStub);
  const queryClient = createAuthenticationQueryClient();
  const router = createMemoryRouter(applicationRoutes, {
    initialEntries: ["/console"],
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

const activityCalls = (
  fetchStub: ReturnType<typeof vi.fn<typeof fetch>>,
): ReturnType<typeof fetchStub.mock.calls.filter> =>
  fetchStub.mock.calls.filter(([url]) => url === "/api/v1/auth/activity");

afterEach((): void => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("genuine-user activity", () => {
  test("acknowledges pointer or keyboard activity at most once per five minutes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-16T00:00:00.000Z"));
    const fetchStub = vi.fn<typeof fetch>(async (url) => {
      if (url === "/api/v1/auth/session") {
        return apiResponse(actor, 200);
      }
      return new Response(null, { status: 204 });
    });
    renderConsole(fetchStub);

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    fireEvent.mouseMove(document.body);
    fireEvent.scroll(document.body);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(activityCalls(fetchStub)).toHaveLength(0);
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(activityCalls(fetchStub)).toHaveLength(1);
    });
    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(activityCalls(fetchStub)).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1_000);
    });
    fireEvent.keyDown(document.body, { key: "Tab" });
    await waitFor(() => {
      expect(activityCalls(fetchStub)).toHaveLength(2);
    });
  });

  test("treats activity 401 as authoritative authentication loss", async () => {
    const fetchStub = vi.fn<typeof fetch>(async (url) => {
      if (url === "/api/v1/auth/session") {
        return apiResponse(actor, 200);
      }
      return unauthenticatedResponse();
    });
    const { queryClient, router } = renderConsole(fetchStub);

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    queryClient.setQueryData(["protected", "console", "secret"], "secret");
    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/sign-in");
    });
    expect(queryClient.getQueryData(["protected", "console", "secret"])).toBeUndefined();
    expect(await screen.findByText("Сеанс тугади. Қайта киринг.")).toBeTruthy();
  });

  test("keeps protected content read-only when activity acknowledgement is uncertain", async () => {
    const fetchStub = vi.fn<typeof fetch>(async (url) => {
      if (url === "/api/v1/auth/session") {
        return apiResponse(actor, 200);
      }
      throw new TypeError("offline");
    });
    renderConsole(fetchStub);

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "Tab" });

    expect(
      await screen.findByText(
        "Алоқа вақтинча мавжуд эмас. Аввал юкланган маълумотлар фақат ўқиш учун қолди.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Маҳсулот эгаси консоли")).toBeTruthy();
  });

  test("hides protected content at the local 12-hour privacy boundary before revalidation", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-16T00:00:00.000Z"));
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(apiResponse(actor, 200))
      .mockRejectedValueOnce(new TypeError("offline"));
    renderConsole(fetchStub);

    expect(await screen.findByText("Маҳсулот эгаси консоли")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1_000);
    });

    expect(
      await screen.findByText(
        "Сервер билан боғланиб бўлмади. Интернет алоқасини текшириб, қайта урининг.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Маҳсулот эгаси консоли")).toBeNull();
    expect(
      fetchStub.mock.calls.filter(
        ([url]) => url === "/api/v1/auth/session",
      ),
    ).toHaveLength(2);
  });
});
