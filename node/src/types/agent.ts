export type State = {
  customer?: string;
  message?: string;
  [key: string]: unknown;
};

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities?: Record<string, number>;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
};

export type NoulAnswer = {
  type: "noul";
  noul: number;
  confidence: number;
};

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;
export type Answers = Record<string, Answer>;

export type Action = string;

export type AgentResult = {
  action: Action;
  used_llm: boolean;
  tool: string | null;
  reply: string;
  answers: Answers;
};

export type PredictResult = {
  answers: Answers;
};
