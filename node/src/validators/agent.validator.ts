import { z } from "zod";

export const agentBodySchema = z.object({
  state: z
    .object({
      customer: z.string().optional(),
      message: z.string().min(1),
    })
    .passthrough(),
});

export type AgentBody = z.infer<typeof agentBodySchema>;

export function validateAgentBody(body: unknown): AgentBody {
  return agentBodySchema.parse(body);
}
