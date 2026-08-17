import { z } from 'zod';

export const ActorRoleSchema = z.enum(['PRODUCT_OWNER']);
export type ActorRole = z.infer<typeof ActorRoleSchema>;

export const ActorContextSchema = z.object({
  id: z.string().min(1),
  role: ActorRoleSchema,
  username: z.string().min(1),
});
export type ActorContext = z.infer<typeof ActorContextSchema>;

export const SignInRequestSchema = z.object({
  username: z.string().min(3).max(64),
  // B10: Use code-point count (not UTF-16 .length) to match password-policy.ts.
  // z.string().max(N) counts UTF-16 code units; emoji take 2 units but 1 code point.
  // A valid 128-codepoint password with emoji would fail .max(128) — use refine instead.
  password: z.string().min(15).refine(
    (val) => [...val].length <= 128,
    { message: 'Парол узунлиги 128 белгидан ошмаслиги керак.' }
  ),
});
export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export const SessionInfoSchema = z.object({
  expiresAt: z.string().datetime(),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

export const SignInResponseSchema = z.object({
  actor: ActorContextSchema,
  session: SessionInfoSchema,
});
export type SignInResponse = z.infer<typeof SignInResponseSchema>;

export const SessionResponseSchema = z.object({
  actor: ActorContextSchema,
  session: SessionInfoSchema,
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SignOutResponseSchema = z.object({
  success: z.literal(true),
});
export type SignOutResponse = z.infer<typeof SignOutResponseSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
