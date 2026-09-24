import type { Action } from "../types/agent.js";
import type { Answers } from "../types/laya.js";

// Both must clear. `confidence` is how peaked the distribution is.
// `probability` is the chosen label's own share. Missing probabilities
// leave confidence as the only check.
const MIN_NEED_PROB = 0.8;
const MIN_NEED_CONF = 0.7;

export function chooseAction(answers: Answers): Action {
  const need = answers.need;
  if (need?.type !== "choice" || need.choice === "other") return "reply";
  const probability = need.probabilities?.[need.choice];
  const sure =
    need.confidence >= MIN_NEED_CONF &&
    (probability == null || probability >= MIN_NEED_PROB);
  return sure ? need.choice : "reply";
}
