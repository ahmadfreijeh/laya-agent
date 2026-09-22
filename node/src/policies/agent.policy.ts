import type { Action } from "../types/agent.js";
import type { Answers } from "../types/laya.js";

const MIN_NEED_CONF = 0.8;

export function chooseAction(answers: Answers): Action {
  const need = answers.need;
  if (need?.type === "choice" && need.confidence >= MIN_NEED_CONF && need.choice !== "other") {
    return need.choice;
  }
  return "reply";
}
