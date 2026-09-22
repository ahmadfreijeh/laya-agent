import type { State } from "./types.js";

export function queueRefund(state: State): string {
  return `queued refund review for ${state.subject || "this message"}`;
}

export function pageOncall(state: State): string {
  return `paged on-call for ${state.subject || "this message"}`;
}

export function handoffSales(state: State): string {
  return `handed off to sales for ${state.subject || "this message"}`;
}
