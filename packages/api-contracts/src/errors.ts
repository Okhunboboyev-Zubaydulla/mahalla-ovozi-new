import { z } from "zod";

export type ApiErrorCode =
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "REQUEST_ORIGIN_REJECTED"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiError = Readonly<{
  error: Readonly<{
    code: ApiErrorCode;
    message: string;
  }>;
}>;

export const apiErrorCodeSchema: z.ZodType<ApiErrorCode, ApiErrorCode> = z.enum([
  "INVALID_CREDENTIALS",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "REQUEST_ORIGIN_REJECTED",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

export const apiErrorSchema: z.ZodType<ApiError, ApiError> = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
  }),
});
