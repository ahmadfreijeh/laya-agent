from src.services.questions import QuestionError, delete_questions, list_questions, load_questions, save_questions
from src.utils import raise_error, success_response


def get_question_files():
    return success_response({"files": list_questions()})


def get_question_file(key: str):
    try:
        return success_response(load_questions(key))
    except QuestionError as err:
        raise_error(err)


def put_question_file(key: str, body: dict):
    try:
        return success_response(save_questions(key, body))
    except QuestionError as err:
        raise_error(err)


def remove_question_file(key: str):
    try:
        return success_response(delete_questions(key))
    except QuestionError as err:
        raise_error(err)
