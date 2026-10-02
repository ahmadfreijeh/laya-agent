from typing import Any, NoReturn

from fastapi import HTTPException
from fastapi.responses import JSONResponse


def raise_error(err: Exception, default_status: int = 500) -> NoReturn:
    status = getattr(err, "status", default_status)
    if not isinstance(status, int) or not 400 <= status < 600:
        status = default_status
    raise HTTPException(status_code=status, detail=str(err)) from err


def success_response(data: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=data)
