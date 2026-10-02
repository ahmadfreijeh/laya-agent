import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";

function validate(schema: z.ZodType, value: unknown, label: string, res: Response, next: NextFunction, assign: (data: unknown) => void): void {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || `invalid ${label}`, details: parsed.error.flatten() });
    return;
  }
  assign(parsed.data);
  next();
}

export function validateBody(schema: z.ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    validate(schema, req.body, "body", res, next, (data) => {
      req.body = data;
    });
  };
}

export function validateParams(schema: z.ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    validate(schema, req.params, "params", res, next, (data) => {
      req.params = data as typeof req.params;
    });
  };
}
