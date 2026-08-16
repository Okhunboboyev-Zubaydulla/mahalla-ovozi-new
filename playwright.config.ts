import { defineConfig } from "@playwright/test";

const baseUrl = "https://127.0.0.1:4173";
const testDatabaseUrl = process.env["TEST_DATABASE_URL"];
const processEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  ),
);

if (testDatabaseUrl === undefined) {
  throw new Error("TEST_DATABASE_URL is required for Playwright tests.");
}

export default defineConfig({
  fullyParallel: false,
  globalSetup: "./apps/web/e2e/global-setup.ts",
  outputDir: "test-results",
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  reporter: "list",
  retries: 0,
  testDir: "apps/web/e2e",
  use: {
    baseURL: baseUrl,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node apps/backend/dist/entrypoints/http.js",
      env: {
        ...processEnvironment,
        APPLICATION_ORIGIN: baseUrl,
        DATABASE_URL: testDatabaseUrl,
        HTTP_HOST: "127.0.0.1",
        HTTP_PORT: "3000",
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: "http://127.0.0.1:3000/api/v1/auth/session",
    },
    {
      command:
        "corepack pnpm --filter @mahalla-ovozi/web exec vite --mode e2e --host 127.0.0.1 --port 4173 --strictPort",
      env: processEnvironment,
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: 120_000,
      url: baseUrl,
    },
  ],
  workers: 1,
});
