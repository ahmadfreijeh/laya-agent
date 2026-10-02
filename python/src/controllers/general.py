from src.utils import success_response


def health():
    return success_response({"ok": True})
