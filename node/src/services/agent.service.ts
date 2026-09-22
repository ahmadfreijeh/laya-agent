import { predict } from "../api/laya.api.js";
import { chooseAction } from "../policies/agent.policy.js";
import type { Action, AgentResult } from "../types/agent.js";
import type { State } from "../types/laya.js";

type SupportAction = {
  reply: string;
  run?: (state: State) => string;
};

// Add customer-support actions here. The key must match an entry in THINGS_TO_DO in python/src/questions.py.
const ACTIONS: Record<string, SupportAction> = {
  reply: {
    reply: "I can help with that.",
  },
  order_status: {
    reply: "I'll check where that order is and update you.",
    run: (state) => `looked up order status for ${state.customer || "this customer"}`,
  },
  refund: {
    reply: "I logged a refund review. Billing will follow up.",
    run: (state) => `queued a refund review for ${state.customer || "this customer"}`,
  },
  cancel: {
    reply: "I logged a cancellation request.",
    run: (state) => `queued a cancellation for ${state.customer || "this customer"}`,
  },
  replace: {
    reply: "I logged a replacement request.",
    run: (state) => `queued a replacement for ${state.customer || "this customer"}`,
  },
  account: {
    reply: "I logged an account-access request.",
    run: (state) => `queued account help for ${state.customer || "this customer"}`,
  },
  follow_up: {
    reply: "I'll pass this to the team so they can follow up.",
    run: (state) => `queued a follow-up for ${state.customer || "this customer"}`,
  },
};

function draftReply(state: State): string {
  const message = state.message || "";
  return (
    "Thanks for the message. A teammate will review it and reply shortly. " +
    `We have your note: ${message.slice(0, 120)}`
  );
}

export async function handle(state: State): Promise<AgentResult> {
  const { answers } = await predict(state);
  const action: Action = chooseAction(answers);
  const registered = ACTIONS[action];
  const usedLlm = !registered;
  const tool = registered?.run?.(state) ?? null;
  const reply = registered ? registered.reply : draftReply(state);
  return { action, used_llm: usedLlm, tool, reply, answers };
}
