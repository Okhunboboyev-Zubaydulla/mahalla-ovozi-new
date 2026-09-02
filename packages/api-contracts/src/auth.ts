import { z } from 'zod';

export const ActorRoleSchema = z.enum(['PRODUCT_OWNER', 'DISTRICT_HOKIM']);
export type ActorRole = z.infer<typeof ActorRoleSchema>;

export const ActorContextSchema = z.object({
  id: z.string().min(1),
  role: ActorRoleSchema,
  username: z.string().min(1),
  districtId: z.string().nullable().optional(),
  mustChangePassword: z.boolean().optional(),
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

export const FirstSignInPasswordChangeRequestSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Жорий парол киритилиши шарт.' }),
  newPassword: z
    .string()
    .min(15, { message: 'Янги парол камида 15 та белгидан иборат бўлиши керак.' })
    .refine(
      (val) => [...val].length <= 128,
      { message: 'Парол узунлиги 128 белгидан ошмаслиги керак.' }
    ),
});
export type FirstSignInPasswordChangeRequest = z.infer<typeof FirstSignInPasswordChangeRequestSchema>;

export const FirstSignInPasswordChangeResponseSchema = z.object({
  success: z.literal(true),
  actor: ActorContextSchema,
});
export type FirstSignInPasswordChangeResponse = z.infer<typeof FirstSignInPasswordChangeResponseSchema>;


