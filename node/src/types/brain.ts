import type { Answers } from "./agent.js";

export type BrainFile = {
  key: string;
  file: string;
  brain?: unknown;
  deleted?: boolean;
};

export type BrainFileList = {
  files: { key: string; file: string }[];
};

export type TryResult = {
  answers: Answers;
  need_clear: boolean;
  followups: string[];
};
