export type State = {
  customer?: string;
  message?: string;
  [key: string]: unknown;
};

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
export type Answers = Record<string, Answer>;
