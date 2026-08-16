import { describe, expect, test } from "vitest";

import * as authContracts from "@mahalla-ovozi/api-contracts";

type RuntimeSchema = Readonly<{
  safeParse: (value: unknown) =>
    | Readonly<{ data: unknown; success: true }>
    | Readonly<{ success: false }>;
}>;

const requireSchema = (name: string): RuntimeSchema => {
  const value = Reflect.get(authContracts, name);
  expect(value, `${name} must be exported`).toBeDefined();

  if (
    typeof value !== "object" ||
    value === null ||
    !("safeParse" in value) ||
    typeof value.safeParse !== "function"
  ) {
    throw new TypeError(`${name} must be a runtime schema.`);
  }

  return value as RuntimeSchema;
};

describe("Story 1.1 shared authentication contracts", () => {
  test("canonicalizes a valid sign-in request without trimming its password", (): void => {
    const schema = requireSchema("authSignInRequestSchema");

    const result = schema.safeParse({
      password: "  O\u0308ta maxfiy parol  ",
      username: "  O\u0308Owner  ",
    });

    expect(result).toEqual({
      data: {
        password: "  Öta maxfiy parol  ",
        username: "ÖOwner",
      },
      success: true,
    });
  });

  test("rejects unknown credential fields and invalid credential lengths", (): void => {
    const schema = requireSchema("authSignInRequestSchema");

    expect(
      schema.safeParse({
        password: "Owner secure password",
        role: "PRODUCT_OWNER",
        username: "Owner",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ password: "short password", username: "Owner" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({
        password: "Owner secure password",
        username: "x".repeat(65),
      }).success,
    ).toBe(false);
  });

  test("accepts only the browser-safe Product Owner actor summary", (): void => {
    const schema = requireSchema("authActorSchema");
    const actor = {
      accountId: "13b38f2d-e536-4fe5-a1ed-a346087e4334",
      role: "PRODUCT_OWNER",
      username: "Owner",
    };

    expect(schema.safeParse(actor)).toEqual({ data: actor, success: true });
    expect(schema.safeParse({ ...actor, passwordHash: "secret" }).success).toBe(
      false,
    );
  });

  test("accepts only the locked sanitized API error envelope", (): void => {
    const schema = requireSchema("apiErrorSchema");

    expect(
      schema.safeParse({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Нотўғри фойдаланувчи номи ёки парол.",
        },
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        error: {
          code: "DATABASE_ERROR",
          message: "relation auth_accounts failed",
        },
      }).success,
    ).toBe(false);
  });

  test("defines bodyless authentication mutations as undefined only", (): void => {
    const schema = requireSchema("authNoBodySchema");

    expect(schema.safeParse(undefined)).toEqual({
      data: undefined,
      success: true,
    });
    expect(schema.safeParse({}).success).toBe(false);
  });
});
