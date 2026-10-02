import type { Request, Response } from "express";

import { DEFAULT_THEME, publishTheme, readPublishedTheme, readTheme } from "../services/theme.service.js";
import type { Theme } from "../types/theme.js";
import { sendError, sendSuccess } from "../utils/response.util.js";

export async function getTheme(_req: Request, res: Response): Promise<void> {
  try {
    res.setHeader("Cache-Control", "no-store");
    sendSuccess(res, { theme: await readTheme(), defaults: DEFAULT_THEME });
  } catch (err) {
    sendError(res, err);
  }
}

export async function postPublishedTheme(req: Request, res: Response): Promise<void> {
  try {
    const id = await publishTheme(req.body as Theme);
    sendSuccess(res, { id, theme: req.body, themePath: `/widget/themes/${id}` }, 201);
  } catch (err) {
    sendError(res, err);
  }
}

export async function getPublishedTheme(req: Request, res: Response): Promise<void> {
  try {
    const theme = await readPublishedTheme(req.params.id as string);
    res.setHeader("Cache-Control", "public, max-age=300");
    sendSuccess(res, { theme });
  } catch (err) {
    sendError(res, err);
  }
}
