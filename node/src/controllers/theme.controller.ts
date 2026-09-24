import type { Request, Response } from "express";

import { DEFAULT_THEME, readTheme, saveTheme } from "../services/theme.service.js";
import type { Theme } from "../validators/theme.validator.js";

export async function getTheme(_req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  res.json({ theme: await readTheme(), defaults: DEFAULT_THEME });
}

export async function putTheme(req: Request, res: Response): Promise<void> {
  try {
    res.json({ theme: await saveTheme(req.body as Theme) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "could not save the theme" });
  }
}
