from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from src.model import load_model


class PredictIn(BaseModel):
    state: Any
    questions: dict


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = load_model()
    yield


app = FastAPI(title="laya-predict", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/predict")
def predict(body: PredictIn) -> dict:
    result = app.state.model.predict(body.state, body.questions)
    return {"answers": result["answers"]}
