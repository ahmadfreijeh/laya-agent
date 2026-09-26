# Relay

Two local servers. **Laya** (Python) answers a question file. **Relay** (Node) picks one action from `need` and returns a template. No LLM. No real order/billing/account backend.

```
POST /agent → validate → Laya /predict → policy → stub tool → replies.json
```

Read this file instead of walking the tree. Open only the files named for the task. Prefer grep over reading whole files. Do not spawn explore agents for this repo. Do not rewrite README or add comments unless asked.

After a change that alters architecture, file ownership, routes, commands, policy thresholds, or a durable project invariant, use `.agents/skills/maintain-agents-md/SKILL.md` before the final response. Skip it for isolated copy, styling, tests, and local bug fixes that do not change how future work should be approached.

Use `$api-maintainer` for API endpoint, contract, OpenAPI, and cross-server integration changes. Its project skill is `.agents/skills/api-maintainer/SKILL.md`.

## Layout

| Path | Role |
|---|---|
| `python/src/server.py` | FastAPI: `/predict`, `/questions`, `/questions/try` |
| `python/src/model.py` | Loads `convaiinnovations/laya` once |
| `python/src/questions.py` | Load/save brains from `python/questions/` |
| `python/questions/default.json` | Shipped brain |
| `node/src/server.ts` | Express: pages, static, routes |
| `node/src/controllers/agent.controller.ts` | `POST /agent` |
| `node/src/services/agent.service.ts` | Policy + `TOOLS` stubs |
| `node/src/policies/agent.policy.ts` | Action bars (0.7 conf, 0.8 prob) |
| `node/src/replies.json` | Reply templates |
| `node/src/api/laya.api.ts` | HTTP to Python (`LAYA_URL`) |
| `node/src/controllers/questions.controller.ts` | Brain CRUD proxy |
| `node/src/controllers/theme.controller.ts` | Theme API |
| `node/src/services/theme.service.ts` | `node/data/widget-theme.json` |
| `node/public/widget.js` | Embeddable chat |
| `node/views/*.ejs` | `/`, `/test`, `/brain`, `/theme` pages |
| `node/src/simulate.ts` | Scripted threads through `handle()` |
| `HOSTING.md` | nginx / HTTPS |

Node never loads the model. Python never writes customer replies.

## Edit map

| Change | Files |
|---|---|
| Questions / follow-ups | `python/questions/*.json` |
| Customer copy | `node/src/replies.json` |
| New action the user sees | brain `need` label + `replies.json` + optional stub in `TOOLS` |
| Widget look | `node/data/widget-theme.json` or theme page |
| Landing page / navigation | `node/views/home.ejs`, `node/views/partials/nav.ejs` |
| Predict / shortlist / scenarios | `python/src/server.py` |
| Action / reply choice | `agent.policy.ts`, `agent.service.ts` |

`urgency`, `language`, `upset`, and scenario answers are returned in `answers`. Node does not use them for action or reply text.

## Policy (do not rediscover)

- Python: shared questions first (`predict_shortlist`). Scenario pass only if `need` is not `other` and clears that file’s `min_need_conf` / `min_need_prob`.
- Node: action = `need.choice` only if confidence ≥ `0.7` and label probability ≥ `0.8`. Else `reply`.
- If no tool ran, Node may use `reply_kind` (greeting ≥ `0.8`, general ≥ `0.6`). Else unclear line.
- One message only. Conversation is not sent to Laya.
- `used_llm` is a missing-template flag. No language model runs.

## Commands

```bash
# Python (load model first)
cd python && source .venv/bin/activate && uvicorn src.server:app --host 127.0.0.1 --port 8000

# Node
cd node && npm start

# Types
cd node && npm run typecheck

# Simulation (Laya must be up)
cd node && npm run simulate -- happy
```

UI: `http://127.0.0.1:3000/test` `/brain` `/theme` `/docs` — Laya docs: `:8000/docs`.

## Code

- Small diffs. Match the file you are in. No new deps, folders, or abstractions unless asked.
- Node: TypeScript ESM, Express 5, Zod at the edge, EJS views.
- Python: FastAPI, brains in `python/questions/`. `billing` and `billing.json` are the same file.
- Do not invent a second action per message, real tools, or fine-tunes (`python/train/` is empty).

## Keep this file useful

- Record only facts that save future agents from broad discovery or prevent likely mistakes.
- Update an existing row or rule before adding a new section. Keep this a project map, not a changelog.
- Remove or replace stale facts in the same change that makes them stale.
- Do not add implementation details that are obvious from one named file or relevant to only one completed task.
