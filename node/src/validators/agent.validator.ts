import type { NextFunction, Request, Response } from "express";
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
});

export type AgentBody = z.infer<typeof agentBodySchema>;

export function validateAgentBody(req: Request, res: Response, next: NextFunction): void {
  const parsed = agentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }
  req.body = parsed.data;
  next();
}
