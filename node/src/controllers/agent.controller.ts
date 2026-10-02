import type { Request, Response } from "express";

import { handleRequest } from "../services/agent.service.js";
import { sendError, sendSuccess } from "../utils/response.util.js";

export async function postAgent(req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await handleRequest(req.body));
  } catch (err) {
    sendError(res, err, 502);
  }
}
