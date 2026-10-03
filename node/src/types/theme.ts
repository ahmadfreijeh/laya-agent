export const BUBBLE_ICONS = ["headset", "user", "chat", "bot", "sparkle", "smile", "heart", "star", "bolt", "none"] as const;

export type Theme = {
  title: string;
  greeting: string;
  logo: string;
  primary: string;
  primaryText: string;
  chatBackground: string;
  agentBubble: string;
  agentText: string;
  agentIcon: (typeof BUBBLE_ICONS)[number];
  userIcon: (typeof BUBBLE_ICONS)[number];
  position: "right" | "left";
};

export type WebhookCredentials = {
  url: string;
  secret: string;
  managementToken: string;
};

export type PublishedWidget = {
  id: string;
  webhook: WebhookCredentials | null;
};
