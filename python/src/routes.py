from fastapi import APIRouter, Body, Request

from src.controllers.general import health as health_controller
from src.controllers.model import predict as predict_controller, try_questions as try_questions_controller
from src.controllers.questions import (
    get_question_file as get_question_file_controller,
    get_question_files as get_question_files_controller,
    put_question_file as put_question_file_controller,
    remove_question_file as remove_question_file_controller,
)
from src.validators.model import PredictIn, TryQuestionsIn

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return health_controller()


@router.get("/questions")
def get_question_files() -> dict:
    return get_question_files_controller()


@router.get("/questions/{key}")
def get_question_file(key: str) -> dict:
    return get_question_file_controller(key)


@router.put("/questions/{key}")
def put_question_file(key: str, body: dict = Body(...)) -> dict:
    return put_question_file_controller(key, body)


@router.delete("/questions/{key}")
def remove_question_file(key: str) -> dict:
    return remove_question_file_controller(key)


@router.post("/predict")
def predict(request: Request, body: PredictIn) -> dict:
    return predict_controller(request, body)


@router.post("/questions/try")
def try_questions(request: Request, body: TryQuestionsIn) -> dict:
    return try_questions_controller(request, body)
