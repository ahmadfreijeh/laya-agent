import type { Questions } from "./types.js";

// Hard-coded for the demo. Later fetch this object from a DB / CMS.

export const QUESTIONS: Questions = {
  department: {
    type: "choice",
    instructions: "Which department should handle this request?",
    criteria: {
      billing: "invoices, payments, refunds",
      technical: "bugs, outages, system errors",
      sales: "pricing, new contracts",
      other: "everything else",
    },
  },
  urgency: {
    type: "score",
    instructions: "How urgent is this request?",
    criteria: ["not urgent", "soon", "critical deadline or blocking issue"],
  },
  refund_requested: {
    type: "noul",
    instructions: "Does the user explicitly request a refund?",
  },
  needs_written_answer: {
    type: "noul",
    instructions: "Is the user asking a question that needs a written explanation?",
  },
};
