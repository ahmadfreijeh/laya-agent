import { predict } from "../api/laya.api.js";
import { chooseAction } from "../policies/agent.policy.js";
import replies from "../replies.json" with { type: "json" };
import type { AgentResult } from "../types/agent.js";
import type { Answers, State } from "../types/laya.js";

type ReplyKind = { name: string; probability: number };
type SocialLine = { min: number; reply: string };

const social = replies.social as Record<string, SocialLine>;

// Tool logic stays here. The response `tool` field is always a string.
const TOOLS: Record<string, (state: State) => string | void> = {
  order_status: (state) => `looked up order status for ${state.customer || "this customer"}`,
  refund: (state) => `queued a refund review for ${state.customer || "this customer"}`,
  cancel: (state) => `queued a cancellation for ${state.customer || "this customer"}`,
  replace: (state) => `queued a replacement for ${state.customer || "this customer"}`,
  account: (state) => `queued account help for ${state.customer || "this customer"}`,
  follow_up: (state) => `queued a follow-up for ${state.customer || "this customer"}`,
};

function replyKind(answers: Answers): ReplyKind | null {
  const answer = answers.reply_kind;
  if (answer?.type !== "choice" || !answer.probabilities) return null;
  let best: ReplyKind | null = null;
  for (const [name, probability] of Object.entries(answer.probabilities)) {
    if (!best || probability > best.probability) best = { name, probability };
  }
  return best;
}

function socialReply(kind: ReplyKind): string | null {
  if (kind.name === "request") return null;
  const route = social[kind.name];
  const line = route && kind.probability >= route.min ? route : replies.unclear;
  return line.reply;
}

function draftReply(state: State): string {
  const message = state.message || "";
  return `${replies.holding}${message.slice(0, 120)}`;
}

export async function handle(state: State): Promise<AgentResult> {
  const { customer, message } = state;
  const { answers } = await predict({ customer, message });
  const chosen = chooseAction(answers);

  console.log("chosen", chosen);

  const run = TOOLS[chosen];

  console.log("run", run);

  const toolRequest = run != null;

  console.log("toolRequest", toolRequest ? "yes" : "no");

  const ran = run?.(state);
  console.log("ran", ran);
  const tool = toolRequest ? (typeof ran === "string" ? ran : chosen) : null;
  console.log("tool", tool);
  const kind = replyKind(answers);
  console.log("kind", kind);
  const socialText = toolRequest || !kind ? null : socialReply(kind);
  const action = socialText ? "reply" : chosen;
  const replyText = replies.actions[action as keyof typeof replies.actions];
  const reply = socialText ?? replyText ?? draftReply(state);
  return { action, used_llm: replyText == null, tool, reply, answers };
}
