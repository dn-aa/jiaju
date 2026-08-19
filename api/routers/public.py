"""公开路由：验证码（FR-7.2）与健康检查；只读内容接口（banners/products/...）在阶段 2~5 按模块补充。"""
import base64
import uuid

from fastapi import APIRouter, Request

from core.captcha import gen_captcha_text, render_captcha
from core.config import settings
from core.limiter import captcha_store, client_ip, rate_limit
from core.response import ok

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/health")
def health():
    return ok({"status": "up"})


@router.get("/captcha")
def captcha(request: Request):
    """图形验证码：返回 captcha_id + base64 PNG（答案存 Redis 60s）。"""
    if not settings.captcha_enabled:
        return ok({"captcha_id": "disabled", "image": None})
    text = gen_captcha_text()
    captcha_id = uuid.uuid4().hex
    captcha_store(captcha_id, text)
    img = render_captcha(text)
    return ok({
        "captcha_id": captcha_id,
        "image": "data:image/png;base64," + base64.b64encode(img).decode(),
    })
