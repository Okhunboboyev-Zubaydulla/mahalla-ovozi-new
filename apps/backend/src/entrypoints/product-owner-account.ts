import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Readable, Writable } from "node:stream";

import pg from "pg";

import { createArgon2idPasswordCrypto } from "../adapters/crypto/argon2id-password-crypto.js";
import { createPostgresAuthStore } from "../adapters/db/postgres-auth-store.js";
import { CredentialValidationError } from "../modules/auth/credential-policy.js";
import { provisionProductOwner } from "../modules/auth/provision-product-owner.js";

const { Pool } = pg;

type CommandEnvironment = Readonly<Record<string, string | undefined>>;

export type ProductOwnerAccountCommandInput = Readonly<{
  arguments: readonly string[];
  environment: CommandEnvironment;
  stderr: Writable;
  stdin: Readable & Readonly<{ isTTY?: boolean }>;
  stdout: Writable;
}>;

class CommandInputError extends Error {
  override readonly name = "CommandInputError";
}

const requireEnvironmentValue = (
  environment: CommandEnvironment,
  key: string,
): string => {
  const value = environment[key];
  if (value === undefined || value === "") {
    throw new CommandInputError(`${key} is required.`);
  }

  return value;
};

const readPassword = async (
  stdin: ProductOwnerAccountCommandInput["stdin"],
): Promise<string> => {
  if (stdin.isTTY === true) {
    throw new CommandInputError(
      "password must be supplied through non-interactive stdin.",
    );
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const framedPassword = Buffer.concat(chunks).toString("utf8");
  const password = framedPassword.endsWith("\r\n")
    ? framedPassword.slice(0, -2)
    : framedPassword.endsWith("\n")
      ? framedPassword.slice(0, -1)
      : framedPassword;

  if (password.includes("\r") || password.includes("\n")) {
    throw new CommandInputError("stdin must contain exactly one password line.");
  }

  return password;
};

export const executeProductOwnerAccountCommand = async (
  input: ProductOwnerAccountCommandInput,
): Promise<number> => {
  let pool: InstanceType<typeof Pool> | undefined;

  try {
    if (input.arguments.length > 0) {
      throw new CommandInputError("command-line arguments are not accepted.");
    }
    const databaseUrl = requireEnvironmentValue(input.environment, "DATABASE_URL");
    const username = requireEnvironmentValue(
      input.environment,
      "PRODUCT_OWNER_USERNAME",
    );
    const password = await readPassword(input.stdin);
    pool = new Pool({ connectionString: databaseUrl });
    const result = await provisionProductOwner(
      { password, username },
      {
        authStore: createPostgresAuthStore(pool),
        passwordCrypto: createArgon2idPasswordCrypto(),
      },
    );
    input.stdout.write(
      `Product Owner ${result.operation}: ${result.username} (${result.accountId})\n`,
    );
    return 0;
  } catch (error) {
    const message =
      error instanceof CommandInputError ||
      error instanceof CredentialValidationError
        ? error.message
        : "persistence failed; verify DATABASE_URL, migration state, and database availability.";
    input.stderr.write(`Product Owner account command failed: ${message}\n`);
    return 1;
  } finally {
    await pool?.end();
  }
};

const entrypointPath = process.argv[1];
if (
  entrypointPath !== undefined &&
  pathToFileURL(resolve(entrypointPath)).href === import.meta.url
) {
  process.exitCode = await executeProductOwnerAccountCommand({
    arguments: process.argv.slice(2),
    environment: process.env,
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  });
}
