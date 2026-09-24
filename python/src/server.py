from contextlib import asynccontextmanager
from typing import Any, NoReturn

import laya
from fastapi import Body, FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.model import load_model
from src.questions import (
    QuestionError,
    delete_questions,
    list_questions,
    load_questions,
    save_questions,
)


class PredictIn(BaseModel):
    state: Any
    key: str = Field(
        default="default",
        description="Question file name in python/questions. `support` and `support.json` both load support.json.",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    model = load_model()
    app.state.model = model
    app.state.embed_fn = laya.embed_fn_from_agent(model)
    yield


app = FastAPI(
    title="Laya (Python)",
    version="0.1.0",
    description="Loads the Laya model and the question file named by predict's key, shortlists those questions, and returns answers. Swagger UI is at /docs.",
    lifespan=lifespan,
)


def raise_question_error(err: QuestionError) -> NoReturn:
    raise HTTPException(status_code=err.status, detail=str(err)) from err


def score(model, embed_fn, state: Any, questions: dict, shortlist_k: int) -> dict:
    result = laya.predict_shortlist(model, state, questions, embed_fn, k=shortlist_k)
    return result["answers"]


def need_is_clear(need: dict, spec: dict) -> bool:
    if need.get("type") != "choice" or need.get("choice") in (None, "other"):
        return False
    if need.get("confidence", 0) < spec["min_need_conf"]:
        return False
    probability = (need.get("probabilities") or {}).get(need.get("choice"))
    if probability is None:
        return True
    return probability >= spec["min_need_prob"]


def scenario_questions(answers: dict, spec: dict) -> dict | None:
    need = answers.get("need") or {}
    if not need_is_clear(need, spec):
        return None
    return (spec.get("scenarios") or {}).get(need.get("choice"))


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/questions")
def get_question_files() -> dict:
    return {"files": list_questions()}


@app.get("/questions/{key}")
def get_question_file(key: str) -> dict:
    try:
        return load_questions(key)
    except QuestionError as err:
        raise_question_error(err)


@app.put("/questions/{key}")
def put_question_file(key: str, body: dict = Body(...)) -> dict:
    try:
        return save_questions(key, body)
    except QuestionError as err:
        raise_question_error(err)


@app.delete("/questions/{key}")
def remove_question_file(key: str) -> dict:
    try:
        return delete_questions(key)
    except QuestionError as err:
        raise_question_error(err)


@app.post("/predict")
def predict(body: PredictIn) -> dict:
    try:
        loaded = load_questions(body.key)
    except QuestionError as err:
        raise_question_error(err)
    spec = loaded["questions"]
    answers = score(app.state.model, app.state.embed_fn, body.state, spec["shared"], spec["shortlist_k"])
    extra = scenario_questions(answers, spec)
    if extra:
        answers = {
            **answers,
            **score(app.state.model, app.state.embed_fn, body.state, extra, spec["shortlist_k"]),
        }
    return {"answers": answers, "key": loaded["key"], "file": loaded["file"]}
