import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type Theme, themeSchema } from "../validators/theme.validator.js";

const THEME_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "widget-theme.json");
const PUBLISHED_DIR = path.join(path.dirname(THEME_FILE), "widget-themes");

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

export async function publishTheme(theme: Theme): Promise<string> {
  await mkdir(PUBLISHED_DIR, { recursive: true });
  const id = randomUUID();
  await writeFile(path.join(PUBLISHED_DIR, `${id}.json`), JSON.stringify(theme, null, 2) + "\n", { flag: "wx" });
  return id;
}

export async function readPublishedTheme(id: string): Promise<Theme | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  let saved: unknown;
  try {
    saved = JSON.parse(await readFile(path.join(PUBLISHED_DIR, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
  const parsed = themeSchema.safeParse(saved);
  return parsed.success ? parsed.data : null;
}
