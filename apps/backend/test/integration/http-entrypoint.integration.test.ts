import { describe, expect, test } from "vitest";

import {
  HttpConfigurationError,
  readHttpConfiguration,
} from "../../src/entrypoints/http.js";

const validEnvironment = {
  APPLICATION_ORIGIN: "https://mahalla.test",
  DATABASE_URL:
    "postgresql://mahalla_test:mahalla_test_password@127.0.0.1:55433/mahalla_test",
  HTTP_HOST: "127.0.0.1",
  HTTP_PORT: "3000",
} as const;

describe("Story 1.1 HTTP entrypoint configuration", () => {
  test("parses the complete explicit HTTP runtime configuration", (): void => {
    expect(readHttpConfiguration(validEnvironment)).toEqual({
      applicationOrigin: "https://mahalla.test",
      databaseUrl:
        "postgresql://mahalla_test:mahalla_test_password@127.0.0.1:55433/mahalla_test",
      host: "127.0.0.1",
      port: 3000,
    });
  });

  test.each([
    "APPLICATION_ORIGIN",
    "DATABASE_URL",
    "HTTP_HOST",
    "HTTP_PORT",
  ])("rejects a missing %s value", (missingKey): void => {
    const environment = { ...validEnvironment, [missingKey]: undefined };

    expect(() => readHttpConfiguration(environment)).toThrow(
      new HttpConfigurationError(`${missingKey} is required.`),
    );
  });

  test.each(["0", "65536", "3.5", "not-a-port"])(
    "rejects invalid HTTP_PORT %s",
    (port): void => {
      expect(() =>
        readHttpConfiguration({ ...validEnvironment, HTTP_PORT: port }),
      ).toThrow(new HttpConfigurationError("HTTP_PORT must be 1 to 65535."));
    },
  );

  test("rejects an application URL that is not an exact origin", (): void => {
    expect(() =>
      readHttpConfiguration({
        ...validEnvironment,
        APPLICATION_ORIGIN: "https://mahalla.test/path",
      }),
    ).toThrow(
      new HttpConfigurationError("APPLICATION_ORIGIN must be an exact URL origin."),
    );
  });
});
