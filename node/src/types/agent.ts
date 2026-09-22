import type { Answers } from "./laya.js";

export type Action = string;

export type AgentResult = {
  action: Action;
  used_llm: boolean;
  tool: string | null;
  reply: string;
  answers: Answers;
};
