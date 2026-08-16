import { z } from "zod";

export * from "./auth.js";
export * from "./errors.js";

export const apiBasePathSchema: z.ZodLiteral<"/api/v1"> = z.literal("/api/v1");
export type ApiBasePath = z.infer<typeof apiBasePathSchema>;
