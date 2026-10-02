import type { Response } from "express";

export function sendError(res: Response, err: unknown, defaultStatus = 500): void {
  const status = err && typeof err === "object" && "status" in err && typeof err.status === "number" ? err.status : defaultStatus;
  const message = err instanceof Error ? err.message : "request failed";
  res.status(status >= 400 && status < 600 ? status : defaultStatus).json({ error: message });
}

export function sendSuccess(res: Response, data: unknown, status = 200): void {
  res.status(status).json(data);
}
