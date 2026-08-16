import { z } from "zod";

const countCodePoints = (value: string): number => Array.from(value).length;

const canonicalUsernameSchema = z
  .string()
  .transform((value) => value.trim().normalize("NFC"))
  .refine((value) => {
    const length = countCodePoints(value);
    return length >= 1 && length <= 64;
  });

const authenticationPasswordSchema = z
  .string()
  .transform((value) => value.normalize("NFC"))
  .refine((value) => {
    const length = countCodePoints(value);
    return length >= 15 && length <= 128;
  });

export type AuthSignInRequest = Readonly<{
  password: string;
  username: string;
}>;

export type AuthActor = Readonly<{
  accountId: string;
  role: "PRODUCT_OWNER";
  username: string;
}>;

export type AuthNoBody = undefined;

export const authSignInRequestSchema: z.ZodType<
  AuthSignInRequest,
  AuthSignInRequest
> = z.strictObject({
  password: authenticationPasswordSchema,
  username: canonicalUsernameSchema,
});

export const authActorSchema: z.ZodType<AuthActor, AuthActor> = z.strictObject({
  accountId: z.string().min(1).max(128),
  role: z.literal("PRODUCT_OWNER"),
  username: z.string().min(1).max(64),
});

export const authNoBodySchema: z.ZodType<AuthNoBody, AuthNoBody> = z.undefined();
