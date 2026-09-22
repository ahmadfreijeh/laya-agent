import { predict } from "./layaClient.js";
import { chooseAction } from "./policy.js";
import { QUESTIONS } from "./questions.js";
import { TEMPLATES, draftReply } from "./replies.js";
import { handoffSales, pageOncall, queueRefund } from "./tools.js";
import type { Action, AgentResult, Questions, State } from "./types.js";

const TOOLS: Partial<Record<Action, (state: State) => string>> = {
  refund: queueRefund,
  oncall: pageOncall,
  sales: handoffSales,
};

export async function handle(state: State, questions: Questions = QUESTIONS): Promise<AgentResult> {
  const { answers } = await predict(state, questions);
  const action = chooseAction(answers);
  const usedLlm = action === "draft";
  const tool = TOOLS[action] ? TOOLS[action](state) : null;
  const reply = usedLlm ? draftReply(state) : TEMPLATES[action];
  return { action, used_llm: usedLlm, tool, reply, answers };
}
