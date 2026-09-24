from contextlib import asynccontextmanager
from typing import Any

import laya
from fastapi import FastAPI
from pydantic import BaseModel

from src.model import load_model
from src.questions import MIN_NEED_CONF, MIN_NEED_PROB, SCENARIOS, SHARED_QUESTIONS, SHORTLIST_K


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


def need_is_clear(need: dict) -> bool:
    if need.get("type") != "choice" or need.get("choice") in (None, "other"):
        return False
    if need.get("confidence", 0) < MIN_NEED_CONF:
        return False
    probability = (need.get("probabilities") or {}).get(need.get("choice"))
    if probability is None:
        return True
    return probability >= MIN_NEED_PROB


def scenario_questions(answers: dict) -> dict | None:
    need = answers.get("need") or {}
    if not need_is_clear(need):
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
