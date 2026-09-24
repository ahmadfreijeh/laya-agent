import "./config.js";
import Table from "cli-table3";
import figlet from "figlet";
import ora from "ora";

import { handle } from "./services/agent.service.js";
import type { Answer, Answers } from "./types/laya.js";

const customer = "maya@acme.com";

const scenarios = {
  happy: [
    "Hi, could you tell me where my order is? It was due yesterday.",
    "Thanks. It still hasn't arrived, so I'd like a refund when you can.",
    "Also, I can't sign in. No rush, whenever someone can help.",
  ],
  upset: [
    "Where is my order?! It was supposed to be here yesterday and nobody told me anything.",
    "This is ridiculous. It still isn't here. I want my money back now.",
    "And I can't even log in. This is unacceptable.",
  ],
};

type ScenarioName = keyof typeof scenarios;
type Turn = { message: string; answers: Answers };
type Run = { name: string; turns: Turn[] };

const names = process.argv.slice(2);
const selected = names.filter((name): name is ScenarioName => name in scenarios);
if (selected.length === 0 || selected.length !== names.length) {
  console.error("Usage: npm run simulate -- happy [upset ...]");
  process.exit(1);
}

const runs: Run[] = [];

for (const name of selected) {
  printBanner(name);
  console.log(`conversation with ${customer}\n`);
  const turns: Turn[] = [];
  for (const message of scenarios[name]) {
    const loading = ora("Getting reply").start();
    const result = await handle({ customer, message }).finally(() => loading.stop());
    turns.push({ message, answers: result.answers });
    console.log(`Customer: ${message}`);
    console.log(`Agent:    ${result.reply}`);
    console.log(`          ${result.action}${result.tool ? ` — ${result.tool}` : ""}`);
    logAnswers(result.answers);
    console.log();
  }
  runs.push({ name, turns });
}

if (runs.length >= 2) logEvaluation(runs);

function logAnswers(answers: Answers): void {
  for (const [id, answer] of Object.entries(answers)) {
    console.log(`          ${id}`);
    for (const [label, probability] of labels(answer)) {
      const pct = `${(probability * 100).toFixed(1)}%`.padStart(6);
      console.log(`            ${label.padEnd(22)} ${pct}`);
    }
  }
}

function logEvaluation(runs: Run[]): void {
  const turnCount = Math.max(...runs.map((run) => run.turns.length));
  printBanner("Evaluation");

  for (let turn = 0; turn < turnCount; turn++) {
    printTurn(runs, turn);
    const keys = [...new Set(runs.flatMap((run) => Object.keys(run.turns[turn]?.answers ?? {})))];
    for (const key of keys) {
      const byRun = runs.map((run) => new Map(labelsOf(run.turns[turn]?.answers[key])));
      const ranked = [...new Set(byRun.flatMap((map) => [...map.keys()]))].sort(
        (a, b) => (byRun[0]?.get(b) ?? 0) - (byRun[0]?.get(a) ?? 0),
      );
      console.log(key);
      printTable(
        ["label", ...runs.map((run) => run.name)],
        ranked.map((label) => [label, ...byRun.map((map) => pct(map.get(label)))]),
      );
      console.log();
    }
  }
}

function printBanner(text: string): void {
  const title = figlet.textSync(text, { font: "Small" }).replace(/\s+$/, "");
  const width = Math.max(...title.split("\n").map((line) => line.length));
  console.log(title);
  console.log("─".repeat(width));
  console.log();
}

function printTurn(runs: Run[], turn: number): void {
  printBanner(`Turn ${turn + 1}`);
  for (const run of runs) console.log(`${run.name}: ${run.turns[turn]?.message ?? ""}`);
  console.log();
}

function printTable(headers: string[], rows: string[][]): void {
  const table = new Table({
    head: headers,
    colAligns: headers.map((_, col) => (col === 0 ? "left" : "right")),
    style: { head: [], border: [] },
  });
  for (const row of rows) table.push(row);
  console.log(table.toString());
}

function labelsOf(answer: Answer | undefined): [string, number][] {
  return answer ? labels(answer) : [];
}

function pct(probability: number | undefined): string {
  return probability == null ? "—" : `${(probability * 100).toFixed(1)}%`;
}

function labels(answer: Answer): [string, number][] {
  if (answer.type === "noul") {
    return (
      [
        ["yes", answer.noul],
        ["no", 1 - answer.noul],
      ] as [string, number][]
    ).sort((a, b) => b[1] - a[1]);
  }
  const extra = answer as Answer & {
    probabilities?: Record<string, number>;
    legend?: Record<string, string>;
  };
  return Object.entries(extra.probabilities ?? {})
    .map(([key, probability]) => [extra.legend?.[key] ?? key, probability] as [string, number])
    .sort((a, b) => b[1] - a[1]);
}
