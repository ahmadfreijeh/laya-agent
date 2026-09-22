from contextlib import asynccontextmanager
from typing import Any

import laya
from fastapi import FastAPI
from pydantic import BaseModel

from src.model import load_model
from src.questions import MIN_NEED_CONF, SCENARIOS, SHARED_QUESTIONS, SHORTLIST_K


class PredictIn(BaseModel):
    state: Any


@asynccontextmanager
async def lifespan(app: FastAPI):
    model = load_model()
    app.state.model = model
    app.state.embed_fn = laya.embed_fn_from_agent(model)
    yield


app = FastAPI(
    title="Laya (Python)",
    version="0.1.0",
    description="Loads the Laya model, shortlists questions for the customer's request, and returns answers. Swagger UI is at /docs.",
    lifespan=lifespan,
)


def score(model, embed_fn, state: Any, questions: dict) -> dict:
    result = laya.predict_shortlist(model, state, questions, embed_fn, k=SHORTLIST_K)
    return result["answers"]


def scenario_questions(answers: dict) -> dict | None:
    need = answers.get("need") or {}
    if need.get("type") != "choice":
        return None
    if need.get("confidence", 0) < MIN_NEED_CONF or need.get("choice") == "other":
        return None
    return SCENARIOS.get(need.get("choice"))


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/predict")
def predict(body: PredictIn) -> dict:
    answers = score(app.state.model, app.state.embed_fn, body.state, SHARED_QUESTIONS)
    extra = scenario_questions(answers)
    if extra:
        answers = {**answers, **score(app.state.model, app.state.embed_fn, body.state, extra)}
    return {"answers": answers}
