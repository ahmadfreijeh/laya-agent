# laya-imp

Small demo: **Laya** classifies a support email; a **Node agent** picks a tool or a template.

```text
POST /agent → validator → controller → Laya /predict → policy / tools / reply
```

| Folder | Role |
|---|---|
| `python/` | Load Laya, `POST /predict`. `python/train/` is reserved for later fine-tunes. |
| `node/` | Agent, questions, policy, tools, replies |

## Setup

```bash
cp .env.example .env
```

Optional: uncomment `HF_TOKEN` in `.env` only for gated Hugging Face models.

### Python

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r python/requirements.txt
```

That installs `laya`, `transformers`, `torch`, `accelerate`, `huggingface_hub`, `python-dotenv`, `fastapi`, and `uvicorn`.

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
source .venv/bin/activate
cd python
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

Health check:

```bash
curl -s http://127.0.0.1:3000/health
```

## Call the agent

```bash
curl -s http://127.0.0.1:3000/agent \
  -H 'Content-Type: application/json' \
  -d '{"state":{"from":"user@acme.com","subject":"Duplicate charge on invoice #4411","body":"We were billed twice for March. Please refund the duplicate today."}}'
```

Or call Laya directly:

```bash
curl -s http://127.0.0.1:8000/predict \
  -H 'Content-Type: application/json' \
  -d '{"state":{"body":"We were billed twice. Please refund today."},"questions":{"department":{"type":"choice","instructions":"Which department?","criteria":{"billing":"invoices, refunds","other":"everything else"}}}}'
```
