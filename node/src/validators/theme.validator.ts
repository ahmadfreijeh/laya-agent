import { z } from "zod";

import { BUBBLE_ICONS } from "../types/theme.js";

const color = z.string().regex(/^#[0-9a-f]{6}$/i, "use a hex color like #1c1c1e");
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

export const publishedThemeParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-f-]{36}$/i, "id must be a UUID"),
});
