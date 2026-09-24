import "../config.js";
import type { Answers, State } from "../types/laya.js";

const LAYA_URL = process.env.LAYA_URL || "http://127.0.0.1:8000";

export async function predict(state: State, key?: string): Promise<{ answers: Answers }> {
  const res = await fetch(`${LAYA_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(key ? { state, key } : { state }),
  });
  if (!res.ok) {
    throw new Error(`Laya predict failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as { answers: Answers };
}

export type QuestionFile = {
  key: string;
  file: string;
  questions?: unknown;
  deleted?: boolean;
};

async function laya(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${LAYA_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (err) {
    const error = new Error(err instanceof Error ? err.message : "Laya is unreachable") as Error & {
      status: number;
    };
    error.status = 502;
    throw error;
  }
  const text = await res.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { detail: text };
    }
  }
  if (!res.ok) {
    const detail = body && typeof body === "object" && "detail" in body ? body.detail : text;
    const error = new Error(typeof detail === "string" && detail ? detail : res.statusText) as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return body;
}

export function listQuestionFiles(): Promise<{ files: { key: string; file: string }[] }> {
  return laya("/questions") as Promise<{ files: { key: string; file: string }[] }>;
}

export function getQuestionFile(key: string): Promise<QuestionFile> {
  return laya(`/questions/${encodeURIComponent(key)}`) as Promise<QuestionFile>;
}

export function saveQuestionFile(key: string, questions: unknown): Promise<QuestionFile> {
  return laya(`/questions/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify(questions),
  }) as Promise<QuestionFile>;
}

export type TryResult = {
  answers: Answers;
  need_clear: boolean;
  followups: string[];
};

export function tryQuestionFile(state: State, questions: unknown): Promise<TryResult> {
  return laya("/questions/try", {
    method: "POST",
    body: JSON.stringify({ state, questions }),
  }) as Promise<TryResult>;
}

export function deleteQuestionFile(key: string): Promise<QuestionFile> {
  return laya(`/questions/${encodeURIComponent(key)}`, { method: "DELETE" }) as Promise<QuestionFile>;
}
