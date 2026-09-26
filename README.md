# Relay

Two local servers that turn a customer message into one support action and a fixed reply.

[Try the live demo](https://relay.ahmadfreijeh.com/).

**Laya** (Python) reads the current message and answers a question file. **Relay** (Node) picks an action from `need`, runs a stub tool, and returns a template from `replies.json`. There is no LLM and no real order, billing, or account backend.

```
POST /agent → validate → Laya /predict → policy → stub tool → reply
```

| Folder | Role |
|---|---|
| `python/` | FastAPI. Loads `convaiinnovations/laya` once, stores brains in `python/questions/`, serves `/predict` and `/questions`. |
| `node/` | Express. Public agent, widget, Brain and Theme pages. Calls Python at `LAYA_URL`. Never loads the model. |

Local UI (Node must be running):

| URL | What it does |
|---|---|
| http://127.0.0.1:3000/test | Chat widget |
| http://127.0.0.1:3000/brain | Edit and try question files |
| http://127.0.0.1:3000/theme | Widget look |
| http://127.0.0.1:3000/docs | Node API |
| http://127.0.0.1:8000/docs | Laya API |

To put this on a domain with nginx and HTTPS, see **[HOSTING.md](HOSTING.md)**.

---

## What happens on one message

1. Node requires `state.message`. It forwards `customer`, `message`, and optional `key` to Python.
2. Python loads `python/questions/<key>.json` (`default` if `key` is omitted). `billing` and `billing.json` both mean `billing.json`.
3. Laya answers every **shared** question in one pass (`predict_shortlist`, at most `shortlist_k` labels per choice question).
4. If `need` clears that file’s `min_need_conf` and `min_need_prob`, and the choice is not `other`, Python runs the matching **scenario** questions in a second pass.
5. Node policy (hardcoded, not the file): action = `need.choice` only when confidence ≥ `0.7` and label probability ≥ `0.8`. Otherwise action is `reply`.
6. If that action has a stub in `TOOLS`, Node records a log string (`tool`). Replies come from `node/src/replies.json`.
7. If no tool ran, Node may use `reply_kind` instead: greeting ≥ `0.8`, general ≥ `0.6`. Anything else uses the unclear line.

`urgency`, `language`, `upset`, and scenario answers (`not_arrived`, `refund_reason`, …) are **returned** in `answers`. Node does **not** use them to choose the action or the reply text.

Each call is the current message only. The conversation is not sent to Laya.

---

## What Laya is

**Laya** (`convaiinnovations/laya`) is an open-source decision model (Apache 2.0). You give it a state and typed questions; it returns an answer and a confidence. One forward pass. It does not write the customer reply.

This demo loads the English checkpoint: ModernBERT-large, about 421M parameters, 512-token context, about 800 MB of weights. Python calls `laya.load` at startup and keeps the model in the FastAPI process.

| Type | What comes back |
|---|---|
| `choice` | One label from `criteria`, plus `confidence` |
| `score` | A point on the `criteria` scale, plus `confidence` |
| `noul` | A yes-or-no probability (`noul`), plus `confidence` |

The shipped brain is `python/questions/default.json`. Shared questions there are `need`, `urgency`, `language`, `upset`, and `reply_kind`. Scenario questions run only for a clear `need`.

`default.json` uses `min_need_conf: 0.7` and `min_need_prob: 0.6` for those follow-ups. Node still needs probability ≥ `0.8` before it runs the matching action, so a follow-up can appear in `answers` even when the action stays `reply`.

---

## Setup

### Python

```bash
cp .env.example .env
cd python
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

That installs `laya`, `transformers`, `torch`, `accelerate`, `huggingface_hub`, `python-dotenv`, `fastapi`, and `uvicorn`.

`HF_TOKEN` in the root `.env` is optional. The public checkpoint does not need it.

### Node

```bash
cd node
npm install
cd ..
```

`PORT` defaults to `3000`. `LAYA_URL` defaults to `http://127.0.0.1:8000`.

---

## Run

Start Python first. It loads the model.

**Terminal 1 — Laya**

```bash
cd python
source .venv/bin/activate
uvicorn src.server:app --host 127.0.0.1 --port 8000
```

First start downloads `convaiinnovations/laya` (~800 MB). Later starts use the Hugging Face cache (1–3 minutes to load into RAM).

```bash
curl -s http://127.0.0.1:8000/health
```

**Terminal 2 — Relay**

```bash
cd node
npm start
```

```bash
curl -s http://127.0.0.1:3000/health
# { "ok": true, "name": "Relay" }
```

---

## Brain

http://127.0.0.1:3000/brain edits `python/questions/<name>.json` through Node → Python. A restart is not required after a save.

**Try a message** runs the file as it is on screen (`POST /questions/try`), including unsaved changes, and shows each answer and which follow-ups ran. **Test** opens the widget on the last saved brain.

To add a real action the customer can see:

1. Add a `need` label (and optional scenario questions) in a brain file.
2. Add the same key under `actions` in `node/src/replies.json`.
3. Add a stub in `TOOLS` in `node/src/services/agent.service.ts` if you want a `tool` string.

---

## Embed the chat

```html
<script src="http://127.0.0.1:3000/widget.js" defer></script>
```

The visitor enters an email. That address and the thread stay in this browser’s local storage. New conversation clears both.

| Attribute | Effect |
|---|---|
| `data-endpoint` | Agent URL (default: the host that served the script) |
| `data-title` / `data-greeting` | Override the saved theme |
| `data-theme` | Theme JSON URL (default `GET /widget/theme`) |
| `data-key` | Lock to that brain; hide the picker |
| `data-brains` | Brain list URL (default `GET /questions`) |

Without `data-key`, the widget lists brains and shows a menu when there is more than one. The pick is remembered per device; each brain has its own thread.

Theme lives in `node/data/widget-theme.json` (title, greeting, logo up to 300 KB, colors, icons, corner). Edit it at http://127.0.0.1:3000/theme. Save replaces the file. Sites pick up the next load.

---

## Simulation

Needs Laya running. Walks scripted threads through the same `handle()` path as `/agent`.

```bash
cd node
npm run simulate -- happy
npm run simulate -- upset
npm run simulate -- happy upset
```

`happy` is polite. `upset` is the same asks as complaints. Two or more names print a comparison table of label percentages per turn. Simulation always uses the default brain.

---

## Call the agent

```bash
curl -s http://127.0.0.1:3000/agent \
  -H 'Content-Type: application/json' \
  -d '{"state":{"customer":"user@acme.com","message":"Where is my order? It was supposed to arrive yesterday."}}'
```

Call Laya only:

```bash
curl -s http://127.0.0.1:8000/predict \
  -H 'Content-Type: application/json' \
  -d '{"key":"default","state":{"message":"Where is my order?"}}'
```

---

## Response shape

`POST /agent`:

```json
{
  "action": "order_status",
  "used_llm": false,
  "tool": "looked up order status for user@acme.com",
  "reply": "I'll check where that order is and update you.",
  "answers": {
    "need": { "type": "choice", "choice": "order_status", "confidence": 0.91 },
    "urgency": { "type": "score", "score": 0.4, "confidence": 0.8 },
    "language": { "type": "choice", "choice": "english", "confidence": 0.95 },
    "upset": { "type": "noul", "noul": 0.2, "confidence": 0.7 },
    "reply_kind": { "type": "choice", "choice": "request", "confidence": 0.9 },
    "not_arrived": { "type": "noul", "noul": 0.9, "confidence": 0.88 }
  }
}
```

| Field | Meaning |
|---|---|
| `action` | `reply`, `order_status`, `refund`, `cancel`, `replace`, `account`, `more_help`, or `follow_up`. A tool action needs `need` confidence ≥ `0.7` and probability ≥ `0.8`. |
| `used_llm` | `true` only when `replies.json` has no template for that action. Relay then concatenates a holding line with the message. **No language model runs.** |
| `tool` | Stub log string, or `null` when no tool ran. |
| `reply` | Text shown to the customer. |
| `answers` | Everything Laya returned. Scenario keys appear only when Python’s file bars were met. |

Answer shapes:

| Type | Shape |
|---|---|
| `choice` | `{ "type": "choice", "choice": "order_status", "confidence": 0.91 }` |
| `score` | `{ "type": "score", "score": 0.4, "confidence": 0.8 }` |
| `noul` | `{ "type": "noul", "noul": 0.9, "confidence": 0.88 }` |

`POST /predict` returns `{ "key", "file", "answers" }`.

Errors from `POST /agent`: `400` when `state.message` is missing (`{ "error", "details" }`). `502` when Laya is down (`{ "error" }`).

---

## Files you edit

| Path | What it is |
|---|---|
| `python/questions/*.json` | Brains (questions, shortlist, follow-up bars) |
| `node/src/replies.json` | Customer reply templates and social thresholds |
| `node/data/widget-theme.json` | Widget look |
| `.env` | `PORT`, `LAYA_URL`, `HF_MODEL_ID`, optional `HF_TOKEN` |

---

## Not built yet

- A small language model on low-confidence messages. `used_llm` is only a missing-template flag.
- More than one action per message. Only a single `need` choice is used.
- Fine-tunes. `python/train/` is empty.
- Real tools. Order status, refund, and the rest are strings.
- Using `urgency`, `language`, `upset`, or scenario answers in Node.
