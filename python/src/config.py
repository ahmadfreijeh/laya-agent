import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

root = Path(__file__).resolve().parents[2]
load_dotenv(root / ".env")
load_dotenv()

if not os.getenv("HF_TOKEN", "").strip():
    os.environ.pop("HF_TOKEN", None)


@dataclass(frozen=True)
class Settings:
    model_id: str = os.getenv("HF_MODEL_ID", "convaiinnovations/laya")
    hf_token: str | None = os.getenv("HF_TOKEN") or None


settings = Settings()
