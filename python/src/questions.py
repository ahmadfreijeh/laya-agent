import json
import re
from pathlib import Path
from typing import Any

# Question sets are JSON files in python/questions. Predict loads the file
# named by `key` (the file name, with or without .json).

QUESTIONS_DIR = Path(__file__).resolve().parents[1] / "questions"
KEY_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
ID_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")
QUESTION_TYPES = {"choice", "score", "noul"}


class QuestionError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def normalize_key(key: str) -> str:
    name = key.strip()
    if name.lower().endswith(".json"):
        name = name[:-5]
    if not KEY_RE.fullmatch(name):
        raise QuestionError("key must be a file name like support or support.json")
    return name


def questions_root() -> Path:
    return QUESTIONS_DIR.resolve()


def path_for(key: str) -> Path:
    name = normalize_key(key)
    root = questions_root()
    path = (root / f"{name}.json").resolve()
    if path.parent != root:
        raise QuestionError("invalid key")
    return path


def list_questions() -> list[dict[str, str]]:
    root = questions_root()
    if not root.is_dir():
        return []
    files = []
    for path in sorted(root.glob("*.json")):
        if KEY_RE.fullmatch(path.stem):
            files.append({"key": path.stem, "file": path.name})
    return files


def load_questions(key: str) -> dict[str, Any]:
    path = path_for(key)
    if not path.is_file():
        raise QuestionError(f"no question file named {path.name}", 404)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise QuestionError(f"{path.name} is not valid JSON", 500) from err
    try:
        data = normalize_file(raw)
    except QuestionError as err:
        raise QuestionError(f"{path.name}: {err}", 500) from err
    return {"key": path.stem, "file": path.name, "questions": data}


def save_questions(key: str, raw: Any) -> dict[str, Any]:
    path = path_for(key)
    data = normalize_file(raw)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    return {"key": path.stem, "file": path.name, "questions": data}


def delete_questions(key: str) -> dict[str, Any]:
    path = path_for(key)
    if not path.is_file():
        raise QuestionError(f"no question file named {path.name}", 404)
    if len(list_questions()) <= 1:
        raise QuestionError("this is the only question file, so it can't be deleted", 409)
    path.unlink()
    return {"key": path.stem, "file": path.name, "deleted": True}


def normalize_file(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise QuestionError("question file must be a JSON object")
    allowed = {"shortlist_k", "min_need_prob", "min_need_conf", "shared", "scenarios"}
    unknown = sorted(set(raw) - allowed)
    if unknown:
        raise QuestionError(f"unknown fields: {', '.join(unknown)}")

    shortlist_k = raw.get("shortlist_k", 20)
    min_need_prob = raw.get("min_need_prob", 0.6)
    min_need_conf = raw.get("min_need_conf", 0.7)
    if isinstance(shortlist_k, bool) or not isinstance(shortlist_k, int) or not 1 <= shortlist_k <= 100:
        raise QuestionError("shortlist_k must be an integer from 1 to 100")
    min_need_prob = _unit(min_need_prob, "min_need_prob")
    min_need_conf = _unit(min_need_conf, "min_need_conf")

    shared_raw = raw.get("shared")
    if not isinstance(shared_raw, dict) or not shared_raw:
        raise QuestionError("shared must contain at least one question")
    scenarios_raw = raw.get("scenarios", {})
    if not isinstance(scenarios_raw, dict):
        raise QuestionError("scenarios must be an object")

    seen: set[str] = set()
    shared = {
        question_id: _question(question_id, body, f"shared.{question_id}", seen)
        for question_id, body in shared_raw.items()
    }
    need = shared.get("need")
    need_labels = set(need["criteria"]) if need and need["type"] == "choice" else None

    scenarios: dict[str, dict] = {}
    for trigger, group in scenarios_raw.items():
        label = _line(trigger, "scenario name")
        if label in scenarios:
            raise QuestionError(f"scenario {label} is repeated")
        if need_labels is not None and label not in need_labels:
            raise QuestionError(f"scenario {label} is not one of the need choices")
        if not isinstance(group, dict) or not group:
            raise QuestionError(f"scenarios.{label} needs at least one question")
        scenarios[label] = {
            question_id: _question(question_id, body, f"scenarios.{label}.{question_id}", seen)
            for question_id, body in group.items()
        }

    return {
        "shortlist_k": shortlist_k,
        "min_need_prob": min_need_prob,
        "min_need_conf": min_need_conf,
        "shared": shared,
        "scenarios": scenarios,
    }


def _question(question_id: str, raw: Any, where: str, seen: set[str]) -> dict[str, Any]:
    if not isinstance(question_id, str) or not ID_RE.fullmatch(question_id):
        raise QuestionError(f"{where} id must start with a letter and use letters, numbers, or underscores")
    if question_id in seen:
        raise QuestionError(f"question id {question_id} is used more than once")
    seen.add(question_id)
    if not isinstance(raw, dict):
        raise QuestionError(f"{where} must be an object")
    unknown = sorted(set(raw) - {"type", "instructions", "criteria"})
    if unknown:
        raise QuestionError(f"{where} has unknown fields: {', '.join(unknown)}")
    question_type = raw.get("type")
    if question_type not in QUESTION_TYPES:
        raise QuestionError(f"{where}.type must be choice, score, or noul")
    instructions = raw.get("instructions")
    if not isinstance(instructions, str) or not instructions.strip():
        raise QuestionError(f"{where}.instructions is required")
    question: dict[str, Any] = {"type": question_type, "instructions": instructions.strip()}
    if question_type == "noul":
        if "criteria" in raw:
            raise QuestionError(f"{where} is a noul, so it has no criteria")
        return question
    question["criteria"] = _criteria(raw.get("criteria"), question_type, where)
    return question


def _criteria(raw: Any, question_type: str, where: str) -> list[str] | dict[str, str]:
    if question_type == "score":
        if not isinstance(raw, list) or len(raw) < 2:
            raise QuestionError(f"{where}.criteria needs at least two scale points")
        points = [_line(item, f"{where}.criteria") for item in raw]
        if len(set(points)) != len(points):
            raise QuestionError(f"{where}.criteria has a repeated point")
        return points

    if isinstance(raw, list):
        raw = {item: item for item in raw if isinstance(item, str)}
    if not isinstance(raw, dict) or not raw:
        raise QuestionError(f"{where}.criteria needs at least one label")
    labels: dict[str, str] = {}
    for label, description in raw.items():
        name = _line(label, f"{where}.criteria label")
        if name in labels:
            raise QuestionError(f"{where}.criteria repeats {name}")
        if not isinstance(description, str) or not description.strip():
            raise QuestionError(f"{where}.criteria.{name} needs a description")
        labels[name] = description.strip()
    return labels


def _line(value: Any, where: str) -> str:
    if not isinstance(value, str):
        raise QuestionError(f"{where} must be text")
    text = value.strip()
    if not text or len(text) > 80 or "\n" in text or "\r" in text:
        raise QuestionError(f"{where} must be a single line up to 80 characters")
    return text


def _unit(value: Any, where: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise QuestionError(f"{where} must be a number from 0 to 1")
    number = float(value)
    if not 0 <= number <= 1:
        raise QuestionError(f"{where} must be a number from 0 to 1")
    return number
