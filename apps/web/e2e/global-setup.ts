import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const requireEnvironmentValue = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`${key} is required for Playwright tests.`);
  }
  return value;
};

export const replaceProductOwnerCredential = (
  databaseUrl: string,
  username: string,
  password: string,
): void => {
  const command = spawnSync(
    process.execPath,
    ["apps/backend/dist/entrypoints/product-owner-account.js"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PRODUCT_OWNER_USERNAME: username,
      },
      input: `${password}\n`,
      windowsHide: true,
    },
  );

  if (command.error !== undefined) {
    throw command.error;
  }
  if (command.status !== 0) {
    throw new Error(
      `Product Owner E2E provisioning failed: ${command.stderr.trim()}`,
    );
  }
};

export default (): void => {
  const databaseUrl = requireEnvironmentValue("TEST_DATABASE_URL");
  const username = `e2e-owner-${randomUUID()}`;
  const password = `Mahalla Ovozi E2E ${randomUUID()} secure passphrase`;

  replaceProductOwnerCredential(databaseUrl, username, password);
  process.env["E2E_PRODUCT_OWNER_USERNAME"] = username;
  process.env["E2E_PRODUCT_OWNER_PASSWORD"] = password;
};
