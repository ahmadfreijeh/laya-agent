import { z } from "zod";

export const agentBodySchema = z.object({
  state: z
    .object({
      from: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().min(1),
    })
    .passthrough(),
});

export type AgentBody = z.infer<typeof agentBodySchema>;

export function validateAgentBody(body: unknown): AgentBody {
  return agentBodySchema.parse(body);
}
