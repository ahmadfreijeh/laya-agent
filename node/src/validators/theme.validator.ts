import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

const color = z.string().regex(/^#[0-9a-f]{6}$/i, "use a hex color like #1c1c1e");
export const BUBBLE_ICONS = ["headset", "user", "chat", "bot", "sparkle", "smile", "heart", "star", "bolt", "none"] as const;
const LOGO_URL = /^https?:\/\/\S+$/i;
const LOGO_DATA = /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

export const themeSchema = z.object({
  title: z.string().trim().min(1).max(60),
  greeting: z.string().trim().min(1).max(200),
  logo: z
    .string()
    .max(400_000, "logo must be under about 300 KB")
    .refine((value) => value === "" || LOGO_URL.test(value) || LOGO_DATA.test(value), {
      message: "logo must be an http(s) URL or an uploaded image",
    }),
  primary: color,
  primaryText: color,
  chatBackground: color,
  agentBubble: color,
  agentText: color,
  agentIcon: z.enum(BUBBLE_ICONS),
  userIcon: z.enum(BUBBLE_ICONS),
  position: z.enum(["right", "left"]),
});

export type Theme = z.infer<typeof themeSchema>;

export function validateThemeBody(req: Request, res: Response, next: NextFunction): void {
  const parsed = themeSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    res.status(400).json({
      error: first ? `${first.path.join(".") || "theme"}: ${first.message}` : "invalid theme",
      details: parsed.error.flatten(),
    });
    return;
  }
  req.body = parsed.data;
  next();
}
