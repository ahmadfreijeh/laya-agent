from typing import Any

from pydantic import BaseModel, Field


class PredictIn(BaseModel):
    state: Any
    key: str = Field(
        default="default",
        description="Question file name in python/questions. `support` and `support.json` both load support.json.",
    )


class TryQuestionsIn(BaseModel):
    state: Any
    questions: dict = Field(description="A question file body. It is checked but not saved.")
