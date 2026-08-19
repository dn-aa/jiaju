"""统一响应包装与业务错误码（开发技术文档 §4.3 / 附录 C）。"""
from enum import IntEnum
from typing import Any

from fastapi.responses import JSONResponse


class ErrCode(IntEnum):
    OK = 0
    UNAUTH = 1001        # 未认证（401）
    FORBIDDEN = 1003     # 无权限（403）
    VALIDATION = 2001    # 参数校验失败
    NOT_FOUND = 2004     # 资源不存在
    RATE_LIMIT = 3001    # 频率限制
    CAPTCHA = 3002       # 验证码错误
    FILE_TYPE = 4001     # 文件类型不符
    FILE_SIZE = 4002     # 文件过大
    SYS = 5000           # 系统错误


class BizError(Exception):
    """业务异常：HTTP 状态与业务 code 分离（业务码默认 HTTP 200 承载）。"""

    def __init__(self, code: ErrCode | int, message: str, http_status: int = 200):
        self.code = int(code)
        self.message = message
        self.http_status = http_status
        super().__init__(message)


def ok(data: Any = None, message: str = "ok") -> dict:
    return {"code": 0, "message": message, "data": data, "trace_id": None}


def fail(code: ErrCode | int, message: str) -> JSONResponse:
    return JSONResponse(status_code=200, content={"code": int(code), "message": message, "data": None, "trace_id": None})
