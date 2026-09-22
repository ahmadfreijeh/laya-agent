import type { Action, Answers } from "./types.js";

const MIN_DEPT_CONF = 0.8;
const MIN_REFUND = 0.7;
const MIN_WRITE = 0.6;
const MIN_URGENT = 1.5;

export function chooseAction(answers: Answers): Action {
  const dept = answers.department.choice;
  const deptConf = answers.department.confidence;
  const wantRefund = answers.refund_requested.noul >= MIN_REFUND;
  const urgent = answers.urgency.score >= MIN_URGENT;
  const needsWords = answers.needs_written_answer.noul >= MIN_WRITE;

  if (dept === "billing" && deptConf >= MIN_DEPT_CONF && wantRefund) return "refund";
  if (dept === "technical" && deptConf >= MIN_DEPT_CONF && urgent) return "oncall";
  if (dept === "sales" && deptConf >= MIN_DEPT_CONF) return "sales";
  if (needsWords || deptConf < MIN_DEPT_CONF) return "draft";
  return "ack";
}
