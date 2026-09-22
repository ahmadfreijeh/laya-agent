import type { Answers, Questions, State } from "./types.js";

const LAYA_URL = process.env.LAYA_URL || "http://127.0.0.1:8000";

export async function predict(state: State, questions: Questions): Promise<{ answers: Answers }> {
  const res = await fetch(`${LAYA_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, questions }),
  });
  if (!res.ok) {
    throw new Error(`Laya predict failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as { answers: Answers };
}
