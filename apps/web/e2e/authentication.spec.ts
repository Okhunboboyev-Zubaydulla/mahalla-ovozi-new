import { expect, test, type Page } from "@playwright/test";

import { replaceProductOwnerCredential } from "./global-setup.js";

const invalidCredentialMessage = "Нотўғри фойдаланувчи номи ёки парол.";
const connectionUnavailableMessage =
  "Сервер билан боғланиб бўлмади. Интернет алоқасини текшириб, қайта урининг.";
const consoleHeading = "Маҳсулот эгаси консоли";

const requireEnvironmentValue = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`${key} is required for Playwright tests.`);
  }
  return value;
};

const ownerUsername = (): string =>
  requireEnvironmentValue("E2E_PRODUCT_OWNER_USERNAME");

const ownerPassword = (): string =>
  requireEnvironmentValue("E2E_PRODUCT_OWNER_PASSWORD");

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/sign-in");
  await page.getByLabel("Фойдаланувчи номи").fill(ownerUsername());
  await page.getByLabel("Парол").fill(ownerPassword());
  await page.getByRole("button", { name: "Кириш" }).click();
  await expect(page.getByRole("heading", { name: consoleHeading })).toBeVisible();
  await expect(page).toHaveURL(/\/console$/);
};

test("routes an unauthenticated protected visit to sign-in", async ({ page }) => {
  await page.goto("/console");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByLabel("Фойдаланувчи номи")).toBeVisible();
  await expect(page.getByLabel("Парол")).toBeVisible();
});

test("signs in with a secure host cookie and no browser persistence", async ({
  context,
  page,
}) => {
  await signIn(page);

  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "__Host-mahalla_session",
  );
  expect(sessionCookie).toMatchObject({
    httpOnly: true,
    path: "/",
    sameSite: "Strict",
    secure: true,
  });
  expect(
    await page.evaluate(async () => ({
      indexedDatabases: (await indexedDB.databases()).length,
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
    })),
  ).toEqual({ indexedDatabases: 0, localStorage: 0, sessionStorage: 0 });
});

test("shows the generic failure and clears only the password", async ({ page }) => {
  await page.goto("/sign-in");
  const username = page.getByLabel("Фойдаланувчи номи");
  const password = page.getByLabel("Парол");

  await username.fill(ownerUsername());
  await password.fill("Incorrect E2E password value");
  await page.getByRole("button", { name: "Кириш" }).click();

  await expect(page.getByText(invalidCredentialMessage)).toBeVisible();
  await expect(username).toHaveValue(ownerUsername());
  await expect(password).toHaveValue("");
});

test("exposes autocomplete semantics and visible keyboard focus", async ({ page }) => {
  await page.goto("/sign-in");
  const username = page.getByLabel("Фойдаланувчи номи");
  const password = page.getByLabel("Парол");

  await expect(username).toHaveAttribute("autocomplete", "username");
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await expect(password).toHaveAttribute("type", "password");
  await page.keyboard.press("Tab");
  await expect(username).toBeFocused();
  await expect
    .poll(async () =>
      username.evaluate((element) => getComputedStyle(element).boxShadow),
    )
    .toContain("2px");
});

test("supports keyboard sign-in at a reduced-motion 320px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 640, width: 320 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  const username = page.getByLabel("Фойдаланувчи номи");
  const password = page.getByLabel("Парол");
  const submit = page.getByRole("button", { name: "Кириш" });

  for (const control of [username, password, submit]) {
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  }
  expect(
    await submit.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration) * 1_000,
    ),
  ).toBeLessThanOrEqual(0.01);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await username.fill(ownerUsername());
  await password.fill(ownerPassword());
  await password.press("Enter");

  await expect(page.getByRole("heading", { name: consoleHeading })).toBeVisible();
  await expect(page).toHaveURL(/\/console$/);
});

test("shows uncertainty when initial session bootstrap cannot reach the server", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/session", async (route) => route.abort());

  await page.goto("/console");

  await expect(page.getByText(connectionUnavailableMessage)).toBeVisible();
  await expect(page.getByRole("heading", { name: consoleHeading })).toBeHidden();
  await expect(page).toHaveURL(/\/console$/);
});

test("keeps authorized content read-only during temporary network loss", async ({
  context,
  page,
}) => {
  await signIn(page);
  await page.route("**/api/v1/auth/session", async (route) => route.abort());

  await context.setOffline(true);
  await context.setOffline(false);

  await expect(
    page.getByText(
      "Алоқа вақтинча мавжуд эмас. Аввал юкланган маълумотлар фақат ўқиш учун қолди.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: consoleHeading })).toBeVisible();
  await expect(page.getByRole("button", { name: "Чиқиш" })).toBeDisabled();
});

test("treats server-side invalidation as authoritative authentication loss", async ({
  context,
  page,
}) => {
  await signIn(page);
  replaceProductOwnerCredential(
    requireEnvironmentValue("TEST_DATABASE_URL"),
    ownerUsername(),
    ownerPassword(),
  );

  await context.setOffline(true);
  await context.setOffline(false);

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: consoleHeading })).toBeHidden();
  await expect(page.getByText("Сеанс тугади. Қайта киринг.")).toBeVisible();
});

test("fails offline sign-in now without reconnect replay", async ({
  context,
  page,
}) => {
  let signInRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/auth/sign-in")) {
      signInRequests += 1;
    }
  });
  await page.goto("/sign-in");
  await page.getByLabel("Фойдаланувчи номи").fill(ownerUsername());
  await page.getByLabel("Парол").fill(ownerPassword());

  await context.setOffline(true);
  await page.getByRole("button", { name: "Кириш" }).click();
  await expect(page.getByText(connectionUnavailableMessage)).toBeVisible();
  await context.setOffline(false);
  await page.waitForLoadState("networkidle");

  expect(signInRequests).toBe(1);
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("does not claim or replay offline sign-out and revalidates on reconnect", async ({
  context,
  page,
}) => {
  let signOutRequests = 0;
  let sessionRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/auth/sign-out")) {
      signOutRequests += 1;
    }
    if (request.url().endsWith("/api/v1/auth/session")) {
      sessionRequests += 1;
    }
  });
  await signIn(page);
  const sessionsBeforeReconnect = sessionRequests;

  await context.setOffline(true);
  await page.getByRole("button", { name: "Чиқиш" }).click();
  await expect(
    page.getByText(
      "Чиқиш тасдиқланмади. Сервер билан алоқани текшириб, қайта урининг.",
    ),
  ).toBeVisible();
  await context.setOffline(false);

  await expect.poll(() => sessionRequests).toBeGreaterThan(sessionsBeforeReconnect);
  expect(signOutRequests).toBe(1);
  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByRole("heading", { name: consoleHeading })).toBeVisible();
});

test("reports only genuine pointer or keyboard activity", async ({ page }) => {
  let activityRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/auth/activity")) {
      activityRequests += 1;
    }
  });
  await signIn(page);

  await page.reload();
  expect(activityRequests).toBe(0);
  await page.mouse.move(50, 50);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(activityRequests).toBe(0);
  await page.keyboard.press("Tab");

  await expect.poll(() => activityRequests).toBe(1);
});

test("hides protected content at local inactivity and revalidates authority", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-08-16T00:00:00.000Z") });
  await signIn(page);
  const activityResponse = page.waitForResponse("**/api/v1/auth/activity");
  await page.keyboard.press("Tab");
  await activityResponse;
  let privacyRevalidationRequests = 0;
  await page.route("**/api/v1/auth/session", async (route) => {
    privacyRevalidationRequests += 1;
    await route.abort();
  });

  await page.clock.fastForward(12 * 60 * 60 * 1_000);

  await expect(page.getByText(connectionUnavailableMessage)).toBeVisible();
  await expect(page.getByRole("heading", { name: consoleHeading })).toBeHidden();
  expect(privacyRevalidationRequests).toBe(1);
});

test("clears protected state only after confirmed sign-out", async ({
  context,
  page,
}) => {
  await signIn(page);

  await page.getByRole("button", { name: "Чиқиш" }).click();

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: consoleHeading })).toBeHidden();
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "__Host-mahalla_session",
    ),
  ).toBe(false);
});
