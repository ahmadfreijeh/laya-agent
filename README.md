# Relay

Small demo: a general **customer support agent**. The customer asks for something, **Laya** reads which thing they want done, and the agent runs that action. Shared questions run on every message. Scenario questions run only when that thing needs them. Node sends only state. Question sets are JSON files in `python/questions/`. Create them at http://127.0.0.1:3000/brain. `POST /predict` uses the file named by `key`. Add the matching customer reply in `node/src/replies.json`.

POST /agent → validator → controller → **Laya** /predict → policy / tools / reply

| Folder | Role |
|---|---|
| `python/` | **Laya** server, question JSON files in `python/questions/`, shortlist, requirements, `.env`, and the virtualenv (`.venv`). `python/train/` is reserved for later fine-tunes. |
| `node/` | Agent, policy, and actions. Sends state only. |

## Why **Laya**

Support work starts as a free-text message. **Laya** reads that message alone and answers a fixed list of questions: what the customer wants done, how urgent it is, which language to reply in, whether they are upset, and what kind of reply the message needs. When the need is clear, it also answers the extra questions that action needs, such as why they want a refund or whether the order has already shipped.

Those answers are what Relay acts on. A confident `need` runs that tool. A greeting or a general reply is used only when no tool action is chosen. Each call is only the current message.

Later, a small language model will reason only when **Laya**'s score is too low to pass an action or a reply. Confident messages stay on **Laya**. That small model is the case that can use tokens.

New support work is another question plus another action. The question list can grow; **Laya** shortlists the closest ones on each message. Later fine-tunes live in `python/train/`.

## What **Laya** is

**Laya** (`convaiinnovations/laya`) is an open-source decision model, Apache 2.0. The weights and the `laya` package are public, so Relay runs them on your own machine. It is the same kind of model as **Jev**: you give it a state and typed questions, and it returns an answer with a confidence. It is non-autoregressive: one forward pass does that work. It does not write the customer reply. Relay writes that after it reads the answers.

The checkpoint this demo loads is the English one. Its encoder is ModernBERT-large (about 421M parameters, 512-token context, about 800 MB of weights). Python loads it with `laya.load` and keeps it in the FastAPI process.

Each question has a type:

| Type | What the model returns |
|---|---|
| `choice` | One label from `criteria`, plus `confidence`. |
| `score` | A point on the `criteria` scale, plus `confidence`. |
| `noul` | A yes-or-no probability (`noul`), plus `confidence`. |

`predict_shortlist` is how this server asks. It embeds the state and each choice label with the encoder already loaded (`embed_fn_from_agent`), keeps the closest `SHORTLIST_K` labels (20), then runs one predict on that shorter list. When a question has 20 labels or fewer, the full list goes through and the embed step is skipped. Choice probabilities are over the labels that were kept.

Shared questions run on every message. Scenario questions run in a second call only after `need` is a confident choice. The questions come from `python/questions/<key>.json`. Node never loads the model. It sends `state` and the file `key`, then uses the `answers` object.

## What this changes for the business

- **Faster first step.** Common requests (order status, refund, cancel, replace, account access) start as soon as the message arrives, with a reply the customer can see.
- **Clearer queues.** Urgency and whether the customer is upset tell the team what to handle first. Language tells them how to answer.
- **Less back and forth.** Scenario answers arrive with the ticket: refund reason, shipment state, lockout. The next person starts with those facts.
- **Room to add products.** Each new thing customers ask for is one entry in the question list and one action. The same agent covers more of the catalog over time.
- **A path to several requests at once.** Customers often ask for more than one thing in a sentence. Later, each action can be its own yes-or-no question, so Relay can run every one that is confident enough.
- **No token bill, most of the time.** **Laya** does not charge per token. Most messages are one or two local passes and a fixed reply, with no token cost. You pay for the machine that holds the weights (about 800 MB, downloaded once) and for the people who still handle tickets **Laya** is not confident about. Later, a small language model will reason only on those low-score messages, when the score is too low to pass an action or a reply. Tokens apply there.

Each customer message costs one **Laya** pass for the shared questions, and a second pass only when `need` is confident enough to ask the scenario questions. Those passes return answers. They do not generate text, so there is no token meter on the reply. A longer catalog of things to do stays inside the same pass: the shortlist keeps at most 20 choice labels. Adding a question does not add a token charge.

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

Node listens on `PORT` (default `3000`) and calls `LAYA_URL` (default `http://127.0.0.1:8000`). Both come from `node/.env`. Copy `node/.env.example` if that file is missing.

## Host on a VPS

To put this on a public domain with nginx and HTTPS, follow **[HOSTING.md](HOSTING.md)**. That file is command-based: required steps (box, DNS, install, cache Laya, systemd, firewall, nginx, SSL) and optional ones (www, extra cache path, password on `/brain` and `/theme`).

## Simulation

With **Laya** running, play a short customer conversation through the agent. The log prints the reply and every answer Python returned.

```bash
cd node
npm run simulate -- happy
npm run simulate -- upset
npm run simulate -- happy upset
```

`happy` is a polite thread. `upset` is the same requests, written as complaints. Passing two or more names prints an evaluation table after the conversations: each label's percentage, side by side, per turn.

## API docs

Each server has its own Swagger page:

| Server | URL |
|---|---|
| Node agent | http://127.0.0.1:3000/docs |
| Python **Laya** | http://127.0.0.1:8000/docs |

Health check:

```bash
curl -s http://127.0.0.1:3000/health
```

## Embed the chat

Drop this on any page. The script posts each message to `POST /agent` on the host that served it.

```html
<script src="http://127.0.0.1:3000/widget.js" defer></script>
```

The visitor adds an email in the widget. That address and the messages stay in local storage on this device, so a refresh keeps the same conversation. New conversation clears both. `data-endpoint` overrides the agent URL. `data-title` and `data-greeting` change the header and the first line, and win over the saved theme. `data-key` locks the chat to that brain file and hides the brain menu. Without it, the widget lists brains from `/questions` (or `data-brains`) and shows a menu under the title when there is more than one; the choice is remembered on this device, and each brain keeps its own conversation. A plain host page is at http://127.0.0.1:3000/test. On the Brain page, **Test** opens the widget for the saved brain and starts a new conversation. **Try a message** runs the brain as it is on screen, unsaved changes included, and shows each answer and which follow-ups ran.

The widget's look lives in `node/data/widget-theme.json`: title, greeting, logo (an image URL or an upload up to 300 KB), five colors, the icon beside support replies and beside visitor messages (from a fixed set, or none), and which bottom corner it sits in. Edit it at http://127.0.0.1:3000/theme, which is linked from the Brain page and shows the real widget as a live preview. Save asks for confirmation, then replaces the file. The widget reads it from `GET /widget/theme` each time it loads, so sites pick up changes on their next page load. `data-theme` points the widget at a different theme URL.

## Brain

Open http://127.0.0.1:3000/brain. That page calls Node, and Node calls Python, which writes `python/questions/<name>.json`. Python reads that file on each predict. A restart is not required after a save.

`default.json` is the support set. Omit `key`, or pass `default`, to use it. Pass the file name to use another set. `billing` and `billing.json` both load `billing.json`.

```bash
curl -s http://127.0.0.1:8000/predict \
  -H 'Content-Type: application/json' \
  -d '{"key":"default","state":{"message":"Where is my order?"}}'
```

The same `key` can go on `POST /agent`. The agent forwards it to predict.

## Call the agent

```bash
curl -s http://127.0.0.1:3000/agent \
  -H 'Content-Type: application/json' \
  -d '{"state":{"customer":"user@acme.com","message":"Where is my order? It was supposed to arrive yesterday."}}'
```

Or call **Laya** directly:

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

`POST /agent` returns the action Relay chose, whether a tool ran, the customer reply, and the **Laya** answers that drove the choice.

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
| `action` | The thing to do. One of `reply`, `order_status`, `refund`, `cancel`, `replace`, `account`, `more_help`, `follow_up`. A need runs that tool only when its confidence is at least `0.7` and the chosen label's probability is at least `0.8`. `reply` is used when `need` is `other` or either bar is missed. |
| `used_llm` | `true` when `action` has no registered handler and Relay drafts a holding reply. |
| `tool` | What the action ran, or `null` when that action has no tool. |
| `reply` | Text to show the customer. |
| `answers` | **Laya**'s answers. Scenario keys (here `not_arrived`) appear only when `need` is confident enough. |

Each answer is one of three shapes:

| Question type | Shape |
|---|---|
| `choice` | `{ "type": "choice", "choice": "order_status", "confidence": 0.91 }` |
| `score` | `{ "type": "score", "score": 0.4, "confidence": 0.8 }` |
| `noul` | `{ "type": "noul", "noul": 0.9, "confidence": 0.88 }` |

`confidence`, `score`, and `noul` are numbers from `0` to `1`. Shared keys are always `need`, `urgency`, `language`, `upset`, and `reply_kind`. Each predict call is the current message only.

`reply_kind` is a choice: `unclear`, `greeting`, `general`, and `request`. Node reads it only when no tool action was chosen. A greeting at `0.8` or above gets a hello. A general reply at `0.6` or above gets an acknowledgement. Anything else, including text like `wreoye`, asks the customer what they need.

`POST /predict` returns the answers, plus the question file it loaded:

```json
{
  "key": "default",
  "file": "default.json",
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

`400` when `state.message` is missing. `502` when **Laya** cannot be reached; `details` is omitted and `error` is the failure message.

## Todo

- [x] A chat box that calls `POST /agent`. Load `GET /widget.js` on any page.
- [ ] A small language model that reasons only when **Laya**'s score is too low to pass an action or a reply. Confident messages stay on **Laya**. Tokens apply only on that low-score path.
- [ ] Several actions in one message. Most actions become their own `noul` questions, so each can be true at once. Relay runs an action only when its confidence is high enough. The same action must not stay both in `need` and as a `noul`.
- [ ] Fine-tunes in `python/train/`.
