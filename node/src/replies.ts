import type { Action, State } from "./types.js";

export const TEMPLATES: Record<Exclude<Action, "draft">, string> = {
  refund: "We logged a refund review. Billing will follow up.",
  oncall: "We treated this as a blocking issue and notified on-call.",
  sales: "Sales will follow up on pricing or the contract.",
  ack: "Thanks, we received this and routed it to the right team.",
};

export function draftReply(state: State): string {
  const body = state.body || "";
  return (
    "Thanks for writing. A teammate will review this and reply shortly. " +
    `We have your note: ${body.slice(0, 120)}`
  );
}
