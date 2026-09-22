import type { Request, Response } from "express";
import { ZodError } from "zod";

import { handle } from "../agent.js";
import { validateAgentBody } from "../validators/agent.validator.js";

export async function postAgent(req: Request, res: Response): Promise<void> {
  try {
    const { state } = validateAgentBody(req.body);
    const result = await handle(state);
    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "invalid body", details: err.flatten() });
      return;
    }
    const message = err instanceof Error ? err.message : "agent failed";
    res.status(502).json({ error: message });
  }
}
