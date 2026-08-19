"""全局异常处理：统一转 ApiResponse（HTTP 200 承载业务码，401/403 由中间件兜底）。"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.response import BizError, ErrCode

logger = logging.getLogger("api")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(BizError)
    async def biz_error_handler(_: Request, exc: BizError):
        return JSONResponse(
            status_code=exc.http_status,
            content={"code": exc.code, "message": exc.message, "data": None, "trace_id": None},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        loc = ".".join(str(x) for x in first.get("loc", []) if x not in ("body", "query", "path"))
        msg = first.get("msg", "参数校验失败")
        return JSONResponse(
            status_code=200,
            content={"code": ErrCode.VALIDATION, "message": f"{loc}: {msg}" if loc else msg, "data": None, "trace_id": None},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": ErrCode.UNAUTH if exc.status_code == 401 else (ErrCode.FORBIDDEN if exc.status_code == 403 else ErrCode.SYS),
                     "message": str(exc.detail), "data": None, "trace_id": None},
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(_: Request, exc: Exception):
        logger.exception("unhandled error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"code": ErrCode.SYS, "message": "系统繁忙，请稍后重试", "data": None, "trace_id": None},
        )
