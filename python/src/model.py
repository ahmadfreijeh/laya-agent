import laya

from src.config import Settings, settings


def load_model(cfg: Settings = settings):
    return laya.load(cfg.model_id, token=cfg.hf_token)
