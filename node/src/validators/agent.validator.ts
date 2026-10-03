import { z } from "zod";

export const agentBodySchema = z.object({
  state: z
    .object({
      customer: z.string().optional(),
      message: z.string().min(1),
    })
    .passthrough(),
  key: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}(\.json)?$/i)
    .optional(),
  widgetId: z.string().uuid().optional(),
});

export type AgentBody = z.infer<typeof agentBodySchema>;
