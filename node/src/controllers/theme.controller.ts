import type { Request, Response } from "express";

import { DEFAULT_THEME, publishTheme, readPublishedTheme, readTheme } from "../services/theme.service.js";
import type { Theme } from "../validators/theme.validator.js";

export async function getTheme(_req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  res.json({ theme: await readTheme(), defaults: DEFAULT_THEME });
}

export async function postPublishedTheme(req: Request, res: Response): Promise<void> {
  try {
    const id = await publishTheme(req.body as Theme);
    res.status(201).json({ id, theme: req.body, themePath: `/widget/themes/${id}` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "could not publish the theme" });
  }
}

export async function getPublishedTheme(req: Request, res: Response): Promise<void> {
  const theme = await readPublishedTheme(String(req.params.id));
  if (!theme) {
    res.status(404).json({ error: "theme not found" });
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ theme });
}
