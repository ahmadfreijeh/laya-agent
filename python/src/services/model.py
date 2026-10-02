from typing import Any

import laya

from src.config import Settings, settings


def load_model(cfg: Settings = settings):
    return laya.load(cfg.model_id, token=cfg.hf_token)


def embed_fn_from_model(model):
    return laya.embed_fn_from_agent(model)


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


def run(model, embed_fn, spec: dict, state: Any) -> dict:
    answers = score(model, embed_fn, state, spec["shared"], spec["shortlist_k"])
    need_clear = need_is_clear(answers.get("need") or {}, spec)
    extra = scenario_questions(answers, spec)
    if extra:
        answers = {
            **answers,
            **score(model, embed_fn, state, extra, spec["shortlist_k"]),
        }
    return {"answers": answers, "need_clear": need_clear, "followups": sorted(extra or {})}
