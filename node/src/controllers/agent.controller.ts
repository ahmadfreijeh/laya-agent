import type { Request, Response } from "express";

import { handleRequest } from "../services/agent.service.js";
import { deliverMessageWebhook } from "../services/theme.service.js";
import type { AgentBody } from "../validators/agent.validator.js";
import { sendError, sendSuccess } from "../utils/response.util.js";

export async function postAgent(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as AgentBody;
    const result = await handleRequest(body);
    sendSuccess(res, result);
    if (body.widgetId) {
      void deliverMessageWebhook(body.widgetId, body.state, body.key, result).catch((err) => {
        console.error("webhook delivery failed", err);
      });
    }
  } catch (err) {
    sendError(res, err, 502);
  }
}
