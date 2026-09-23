# Relay

Small demo: a general **customer support agent**. The customer asks for something, **Laya** reads which thing they want done, and the agent runs that action. Shared questions run on every message. Scenario questions run only when that thing needs them. Node sends only state. Add a thing to do in `python/src/questions.py` (`THINGS_TO_DO`, and `SCENARIOS` when it needs extra questions) and in the Node action list. A chat box can call this later.

```text
POST /agent → validator → controller → Laya /predict → policy / tools / reply
```

| Folder | Role |
|---|---|
| `python/` | Laya server, question list, shortlist, requirements, `.env`, and the virtualenv (`.venv`). `python/train/` is reserved for later fine-tunes. |
| `node/` | Agent, policy, and actions. Sends state only. |

## Why Laya

Support work starts as a free-text message. Laya reads that message and answers a fixed list of questions: what the customer wants done, how urgent it is, which language to reply in, and whether they are upset. When the need is clear, it also answers the extra questions that action needs, such as why they want a refund or whether the order has already shipped.

Those answers are what Relay acts on. The agent picks one action when Laya is confident, runs it, and replies. A weak or unclear read stays with a person instead of guessing.

New support work is another question plus another action. The question list can grow; Laya shortlists the closest ones on each message. Later fine-tunes live in `python/train/`.

## What this changes for the business

- **Faster first step.** Common requests (order status, refund, cancel, replace, account access) start as soon as the message arrives, with a reply the customer can see.
- **Clearer queues.** Urgency and whether the customer is upset tell the team what to handle first. Language tells them how to answer.
- **Less back and forth.** Scenario answers arrive with the ticket: refund reason, shipment state, lockout. The next person starts with those facts.
- **Room to add products.** Each new thing customers ask for is one entry in the question list and one action. The same agent covers more of the catalog over time.
- **A path to several requests at once.** Customers often ask for more than one thing in a sentence. Later, each action can be its own yes-or-no question, so Relay can run every one that is confident enough.

## Setup

### Python

Work from `python/`. The virtualenv and env file live in that folder.

```bash
cd python
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

That installs `laya`, `transformers`, `torch`, `accelerate`, `huggingface_hub`, `python-dotenv`, `fastapi`, and `uvicorn`.

Optional: uncomment `HF_TOKEN` in `python/.env` only for gated Hugging Face models.

### Node

```bash
cd node
npm install
cd ..
```

## Run

Use two terminals. Start Python first (it loads the model).

**Terminal 1 — Laya**

```bash
cd python
source .venv/bin/activate
uvicorn src.server:app --host 127.0.0.1 --port 8000
```

First start downloads `convaiinnovations/laya` (~800 MB). Later starts use the local Hugging Face cache.

Health check:

```bash
curl -s http://127.0.0.1:8000/health
```

**Terminal 2 — Agent**

```bash
cd node
npm start
```

Node listens on `PORT` (default `3000`) and calls `LAYA_URL` (default `http://127.0.0.1:8000`).

## API docs

Each server has its own Swagger page:

| Server | URL |
|---|---|
| Node agent | http://127.0.0.1:3000/docs |
| Python Laya | http://127.0.0.1:8000/docs |

Health check:

```bash
curl -s http://127.0.0.1:3000/health
```

## Call the agent

```bash
curl -s http://127.0.0.1:3000/agent \
  -H 'Content-Type: application/json' \
  -d '{"state":{"customer":"user@acme.com","message":"Where is my order? It was supposed to arrive yesterday."}}'
```

Or call Laya directly:

```bash
curl -s http://127.0.0.1:8000/predict \
  -H 'Content-Type: application/json' \
  -d '{"state":{"message":"Where is my order?"}}'
```

## Response shape

Both health checks return:

```json
{ "ok": true }
```

`POST /agent` returns the action Relay chose, whether a tool ran, the customer reply, and the Laya answers that drove the choice.

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
    "not_arrived": { "type": "noul", "noul": 0.9, "confidence": 0.88 }
  }
}
```

| Field | Meaning |
|---|---|
| `action` | The thing to do. One of `reply`, `order_status`, `refund`, `cancel`, `replace`, `account`, `follow_up`. `reply` is used when `need` is `other` or its confidence is below `0.8`. |
| `used_llm` | `true` when `action` has no registered handler and Relay drafts a holding reply. |
| `tool` | What the action ran, or `null` when that action has no tool. |
| `reply` | Text to show the customer. |
| `answers` | Laya's answers. Scenario keys (here `not_arrived`) appear only when `need` is confident enough. |

Each answer is one of three shapes:

| Question type | Shape |
|---|---|
| `choice` | `{ "type": "choice", "choice": "order_status", "confidence": 0.91 }` |
| `score` | `{ "type": "score", "score": 0.4, "confidence": 0.8 }` |
| `noul` | `{ "type": "noul", "noul": 0.9, "confidence": 0.88 }` |

`confidence`, `score`, and `noul` are numbers from `0` to `1`. Shared keys are always `need`, `urgency`, `language`, and `upset`.

`POST /predict` returns only the answers object:

```json
{
  "answers": {
    "need": { "type": "choice", "choice": "order_status", "confidence": 0.91 },
    "urgency": { "type": "score", "score": 0.4, "confidence": 0.8 },
    "language": { "type": "choice", "choice": "english", "confidence": 0.95 },
    "upset": { "type": "noul", "noul": 0.2, "confidence": 0.7 },
    "not_arrived": { "type": "noul", "noul": 0.9, "confidence": 0.88 }
  }
}
```

Errors from `POST /agent`:

```json
{ "error": "invalid body", "details": {} }
```

`400` when `state.message` is missing. `502` when Laya cannot be reached; `details` is omitted and `error` is the failure message.
