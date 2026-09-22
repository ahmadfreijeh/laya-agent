import type { Answers, State } from "../types/laya.js";

const LAYA_URL = process.env.LAYA_URL || "http://127.0.0.1:8000";

export async function predict(state: State): Promise<{ answers: Answers }> {
  const res = await fetch(`${LAYA_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) {
    throw new Error(`Laya predict failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as { answers: Answers };
}
