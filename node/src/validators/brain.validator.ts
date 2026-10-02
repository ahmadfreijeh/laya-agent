import { z } from "zod";

export const brainParamsSchema = z.object({
  key: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}(\.json)?$/i, "key must be a file name like support or support.json"),
});

export const brainBodySchema = z.object({}).passthrough();

export const tryBrainBodySchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  brain: brainBodySchema,
});
