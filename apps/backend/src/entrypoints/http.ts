import { resolve } from "node:path";
import type { Writable } from "node:stream";
import { pathToFileURL } from "node:url";

import type { FastifyInstance } from "fastify";
import pg from "pg";

import { createArgon2idPasswordCrypto } from "../adapters/crypto/argon2id-password-crypto.js";
import { createOpaqueSessionCrypto } from "../adapters/crypto/opaque-session-crypto.js";
import { createPostgresAuthStore } from "../adapters/db/postgres-auth-store.js";
import { createAuthenticationHttpApplication } from "../http/authentication-http-app.js";
import { createAuthService } from "../modules/auth/auth-service.js";

const { Pool } = pg;

type HttpEnvironment = Readonly<Record<string, string | undefined>>;

export type HttpConfiguration = Readonly<{
  applicationOrigin: string;
  databaseUrl: string;
  host: string;
  port: number;
}>;

export class HttpConfigurationError extends Error {
  override readonly name = "HttpConfigurationError";
}

const requireEnvironmentValue = (
  environment: HttpEnvironment,
  key: string,
): string => {
  const value = environment[key];
  if (value === undefined || value.length === 0) {
    throw new HttpConfigurationError(`${key} is required.`);
  }
  return value;
};

const parseApplicationOrigin = (value: string): string => {
  try {
    const parsed = new URL(value);
    if (parsed.origin !== value) {
      throw new HttpConfigurationError(
        "APPLICATION_ORIGIN must be an exact URL origin.",
      );
    }
    return value;
  } catch (error) {
    if (error instanceof HttpConfigurationError) {
      throw error;
    }
    throw new HttpConfigurationError(
      "APPLICATION_ORIGIN must be an exact URL origin.",
    );
  }
};

const parsePort = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new HttpConfigurationError("HTTP_PORT must be 1 to 65535.");
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new HttpConfigurationError("HTTP_PORT must be 1 to 65535.");
  }
  return port;
};

export const readHttpConfiguration = (
  environment: HttpEnvironment,
): HttpConfiguration => ({
  applicationOrigin: parseApplicationOrigin(
    requireEnvironmentValue(environment, "APPLICATION_ORIGIN"),
  ),
  databaseUrl: requireEnvironmentValue(environment, "DATABASE_URL"),
  host: requireEnvironmentValue(environment, "HTTP_HOST"),
  port: parsePort(requireEnvironmentValue(environment, "HTTP_PORT")),
});

export const startAuthenticationHttpServer = async (
  configuration: HttpConfiguration,
  logDestination: Writable,
): Promise<FastifyInstance> => {
  const pool = new Pool({ connectionString: configuration.databaseUrl });
  let application: FastifyInstance | undefined;

  try {
    await pool.query("select 1");
    const passwordCrypto = createArgon2idPasswordCrypto();
    const dummyPasswordHash = await passwordCrypto.hash(
      "Mahalla Ovozi dummy credential",
    );
    application = await createAuthenticationHttpApplication({
      applicationOrigin: configuration.applicationOrigin,
      authService: createAuthService({
        authStore: createPostgresAuthStore(pool),
        dummyPasswordHash,
        passwordCrypto,
        sessionCrypto: createOpaqueSessionCrypto(),
      }),
      logDestination,
    });
    application.addHook("onClose", async (): Promise<void> => {
      await pool.end();
    });
    await application.listen({
      host: configuration.host,
      port: configuration.port,
    });
    return application;
  } catch (error) {
    if (application === undefined) {
      await pool.end();
    } else {
      await application.close();
    }
    throw error;
  }
};

const entrypointPath = process.argv[1];
if (
  entrypointPath !== undefined &&
  pathToFileURL(resolve(entrypointPath)).href === import.meta.url
) {
  try {
    await startAuthenticationHttpServer(
      readHttpConfiguration(process.env),
      process.stdout,
    );
  } catch (error) {
    const message =
      error instanceof HttpConfigurationError
        ? error.message
        : "verify HTTP configuration, PostgreSQL availability, and migration state.";
    process.stderr.write(`HTTP server startup failed: ${message}\n`);
    process.exitCode = 1;
  }
}
