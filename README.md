# Relay

Small demo: a general **customer support agent**. The customer asks for something, **Laya** reads which thing they want done, and the agent runs that action. Shared questions run on every message. Scenario questions run only when that thing needs them. Node sends only state. Add a thing to do in `python/src/questions.py` (`THINGS_TO_DO`, and `SCENARIOS` when it needs extra questions) and in the Node action list. A chat box can call this later.

```text
POST /agent → validator → controller → Laya /predict → policy / tools / reply
```

| Folder | Role |
|---|---|
| `python/` | Laya server, question list, shortlist, requirements, `.env`, and the virtualenv (`.venv`). `python/train/` is reserved for later fine-tunes. |
| `node/` | Agent, policy, and actions. Sends state only. |

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
