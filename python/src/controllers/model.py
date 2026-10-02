from fastapi import Request

from src.services.model import run
from src.services.questions import QuestionError, load_questions, normalize_file
from src.utils import raise_error, success_response
from src.validators.model import PredictIn, TryQuestionsIn


def predict(request: Request, body: PredictIn):
    try:
        loaded = load_questions(body.key)
    except QuestionError as err:
        raise_error(err)
    result = run(request.app.state.model, request.app.state.embed_fn, loaded["questions"], body.state)
    return success_response({"answers": result["answers"], "key": loaded["key"], "file": loaded["file"]})


def try_questions(request: Request, body: TryQuestionsIn):
    try:
        spec = normalize_file(body.questions)
    except QuestionError as err:
        raise_error(err)
    return success_response(run(request.app.state.model, request.app.state.embed_fn, spec, body.state))
