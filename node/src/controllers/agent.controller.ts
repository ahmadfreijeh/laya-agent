import type { Request, Response } from "express";

import { handle } from "../services/agent.service.js";
import type { AgentBody } from "../validators/agent.validator.js";

export async function postAgent(req: Request, res: Response): Promise<void> {
  try {
    const { state } = req.body as AgentBody;
    const result = await handle(state);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "agent failed";
    res.status(502).json({ error: message });
  }
}
