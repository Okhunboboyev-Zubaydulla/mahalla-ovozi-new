import { z } from 'zod';

export const ApiValidationErrorItemSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string().min(1),
  code: z.string().optional(),
});
export type ApiValidationErrorItem = z.infer<typeof ApiValidationErrorItemSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    statusCode: z.number().int().min(400).max(599).optional(),
    details: z.record(z.unknown()).optional(),
    blockers: z.array(z.record(z.unknown())).optional(),
    validationErrors: z.array(ApiValidationErrorItemSchema).optional(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;


