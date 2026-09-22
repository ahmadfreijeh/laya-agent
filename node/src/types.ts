export type State = {
  from?: string;
  subject?: string;
  body?: string;
  [key: string]: unknown;
};

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type NoulQuestion = {
  type: "noul";
  instructions: string;
};

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;
export type Questions = Record<string, Question>;

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
};

export type NoulAnswer = {
  type: "noul";
  noul: number;
  confidence: number;
};

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;
export type Answers = {
  department: ChoiceAnswer;
  urgency: ScoreAnswer;
  refund_requested: NoulAnswer;
  needs_written_answer: NoulAnswer;
  [key: string]: Answer;
};

export type Action = "refund" | "oncall" | "sales" | "draft" | "ack";

export type AgentResult = {
  action: Action;
  used_llm: boolean;
  tool: string | null;
  reply: string;
  answers: Answers;
};
