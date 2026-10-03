import { z } from "zod";
import { isIP } from "node:net";

import { BUBBLE_ICONS } from "../types/theme.js";

const color = z.string().regex(/^#[0-9a-f]{6}$/i, "use a hex color like #1c1c1e");
const LOGO_URL = /^https?:\/\/\S+$/i;
const LOGO_DATA = /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

function testWebhookUrl(url: URL): boolean {
  return process.env.ENABLE_TEST_WEBHOOK === "true" &&
    url.protocol === "http:" &&
    url.hostname === "127.0.0.1" &&
    url.port === String(process.env.PORT || 3000) &&
    url.pathname === "/webhooks/test" &&
    !url.username &&
    !url.password;
}

function publicWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (testWebhookUrl(url)) return true;
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
    if (isIP(host) === 6) return false;
    if (isIP(host) !== 4) return true;
    const [first, second] = host.split(".").map(Number);
    return first !== 0 && first !== 10 && first !== 127 && first !== 169 && !(first === 172 && second >= 16 && second <= 31) && !(first === 192 && second === 168);
  } catch {
    return false;
  }
}

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

export const createWidgetSchema = themeSchema.extend({
  webhookUrl: z.string().trim().url("webhook URL must be a valid URL").refine(publicWebhookUrl, {
    message: "webhook URL must use a public HTTPS address",
  }).optional().or(z.literal("")),
});

export const publishedThemeParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-f-]{36}$/i, "id must be a UUID"),
});
