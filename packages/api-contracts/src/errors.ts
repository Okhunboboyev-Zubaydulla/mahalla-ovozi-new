import { z } from 'zod';
import { PrerequisiteItemSchema } from './readiness.js';

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    blockers: z.array(PrerequisiteItemSchema).optional(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
