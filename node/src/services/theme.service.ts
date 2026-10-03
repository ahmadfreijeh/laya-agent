import { readFile } from "node:fs/promises";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { execute, get, save } from "./database.service.js";
import { themeSchema } from "../validators/theme.validator.js";
import type { AgentResult, State } from "../types/agent.js";
import type { PublishedWidget, Theme } from "../types/theme.js";

const THEME_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "widget-theme.json");
const PUBLISHED_DIR = path.join(path.dirname(THEME_FILE), "widget-themes");
let widgetsTableReady: Promise<void> | undefined;

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

export class ThemeNotFoundError extends Error {
  status = 404;
}

export class WebhookConfigurationError extends Error {
  status = 500;
}

function ensureWidgetsTable(): Promise<void> {
  if (!widgetsTableReady) widgetsTableReady = execute(`
    CREATE TABLE IF NOT EXISTS widgets (
      id INTEGER PRIMARY KEY,
      widget_id TEXT NOT NULL UNIQUE,
      theme_json TEXT NOT NULL,
      webhook_url TEXT,
      webhook_secret_encrypted TEXT,
      management_token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  return widgetsTableReady;
}

function encryptWebhookSecret(secret: string): string {
  const encryptionKey = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!encryptionKey) throw new WebhookConfigurationError("WEBHOOK_ENCRYPTION_KEY must be set before configuring a webhook");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(encryptionKey).digest(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptWebhookSecret(encryptedSecret: string): string {
  const encryptionKey = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!encryptionKey) throw new WebhookConfigurationError("WEBHOOK_ENCRYPTION_KEY must be set before delivering a webhook");
  const [iv, authTag, ciphertext] = encryptedSecret.split(".");
  if (!iv || !authTag || !ciphertext) throw new WebhookConfigurationError("saved webhook secret is invalid");
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(encryptionKey).digest(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

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

export async function publishTheme(theme: Theme, webhookUrl?: string): Promise<PublishedWidget> {
  const id = randomUUID();
  const managementToken = randomBytes(32).toString("base64url");
  const webhookSecret = webhookUrl ? randomBytes(32).toString("base64url") : null;
  await ensureWidgetsTable();
  await save(`
    INSERT INTO widgets (widget_id, theme_json, webhook_url, webhook_secret_encrypted, management_token_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    JSON.stringify(theme),
    webhookUrl || null,
    webhookSecret ? encryptWebhookSecret(webhookSecret) : null,
    createHash("sha256").update(managementToken).digest("base64url"),
    new Date().toISOString(),
  ]);
  return { id, webhook: webhookUrl && webhookSecret ? { url: webhookUrl, secret: webhookSecret, managementToken } : null };
}

export async function readPublishedTheme(id: string): Promise<Theme> {
  let saved: unknown;
  try {
    await ensureWidgetsTable();
    const row = await get<{ theme_json?: string }>("SELECT theme_json FROM widgets WHERE widget_id = ?", [id]);
    saved = row?.theme_json ? JSON.parse(row.theme_json) : undefined;
  } catch {
    saved = undefined;
  }
  if (!saved) {
    try {
      saved = JSON.parse(await readFile(path.join(PUBLISHED_DIR, `${id}.json`), "utf8"));
    } catch {
      throw new ThemeNotFoundError("theme not found");
    }
  }
  const parsed = themeSchema.safeParse(saved);
  if (!parsed.success) throw new ThemeNotFoundError("theme not found");
  return parsed.data;
}

export async function deliverMessageWebhook(widgetId: string, state: State, key: string | undefined, result: AgentResult): Promise<void> {
  await ensureWidgetsTable();
  const widget = await get<{ webhook_url?: string; webhook_secret_encrypted?: string }>(
    "SELECT webhook_url, webhook_secret_encrypted FROM widgets WHERE widget_id = ?",
    [widgetId],
  );
  if (!widget?.webhook_url || !widget.webhook_secret_encrypted) return;

  const deliveryId = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    id: deliveryId,
    event: "message.received",
    createdAt: new Date().toISOString(),
    data: { widgetId, customer: state.customer, message: state.message, brain: key, agent: result },
  });
  const signature = createHmac("sha256", decryptWebhookSecret(widget.webhook_secret_encrypted)).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetch(widget.webhook_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Relay-Webhook/1.0",
      "X-Relay-Delivery": deliveryId,
      "X-Relay-Event": "message.received",
      "X-Relay-Timestamp": timestamp,
      "X-Relay-Signature": `sha256=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`webhook responded with ${response.status}`);
}
