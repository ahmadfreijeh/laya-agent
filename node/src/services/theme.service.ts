import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type Theme, themeSchema } from "../validators/theme.validator.js";

const THEME_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "widget-theme.json");

export const DEFAULT_THEME: Theme = {
  title: "Support",
  greeting: "Hi. How can we help?",
  logo: "",
  primary: "#1c1c1e",
  primaryText: "#ffffff",
  chatBackground: "#f7f7f8",
  agentBubble: "#ffffff",
  agentText: "#1c1c1e",
  agentIcon: "headset",
  userIcon: "user",
  position: "right",
};

export async function readTheme(): Promise<Theme> {
  let saved: unknown;
  try {
    saved = JSON.parse(await readFile(THEME_FILE, "utf8"));
  } catch {
    return DEFAULT_THEME;
  }
  const parsed = themeSchema.safeParse({ ...DEFAULT_THEME, ...(saved as object) });
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

export async function saveTheme(theme: Theme): Promise<Theme> {
  await mkdir(path.dirname(THEME_FILE), { recursive: true });
  const temporary = `${THEME_FILE}.tmp`;
  await writeFile(temporary, JSON.stringify(theme, null, 2) + "\n", "utf8");
  await rename(temporary, THEME_FILE);
  return theme;
}
