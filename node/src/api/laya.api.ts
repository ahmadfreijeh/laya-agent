import "../config.js";
import type { PredictResult, State } from "../types/agent.js";
import type { BrainFile, BrainFileList, TryResult } from "../types/brain.js";

const LAYA_URL = process.env.LAYA_URL || "http://127.0.0.1:8000";

type QuestionFile = Omit<BrainFile, "brain"> & { questions?: unknown };

function asBrainFile({ questions, ...file }: QuestionFile): BrainFile {
  return questions === undefined ? file : { ...file, brain: questions };
}

async function httpCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${LAYA_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const text = await res.text();
  const body: unknown = text
    ? await Promise.resolve(text).then((value) => JSON.parse(value) as unknown).catch(() => ({ detail: text }))
    : {};
  if (!res.ok) {
    const detail = body && typeof body === "object" && "detail" in body ? body.detail : text;
    const error = new Error(typeof detail === "string" && detail ? detail : res.statusText) as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return body as T;
}

export function predict(state: State, key?: string): Promise<PredictResult> {
  return httpCall<PredictResult>("/predict", {
    method: "POST",
    body: JSON.stringify(key ? { state, key } : { state }),
  });
}

export function listBrains(): Promise<BrainFileList> {
  return httpCall<BrainFileList>("/questions");
}

export async function getBrain(key: string): Promise<BrainFile> {
  return asBrainFile(await httpCall<QuestionFile>(`/questions/${encodeURIComponent(key)}`));
}

export async function saveBrain(key: string, brain: unknown): Promise<BrainFile> {
  return asBrainFile(await httpCall<QuestionFile>(`/questions/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify(brain),
  }));
}

export function tryBrain(state: State, brain: unknown): Promise<TryResult> {
  return httpCall("/questions/try", {
    method: "POST",
    body: JSON.stringify({ state, questions: brain }),
  });
}

export async function deleteBrain(key: string): Promise<BrainFile> {
  return asBrainFile(await httpCall<QuestionFile>(`/questions/${encodeURIComponent(key)}`, { method: "DELETE" }));
}
