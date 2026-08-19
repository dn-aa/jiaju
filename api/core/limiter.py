"""Redis 客户端与频率限制（FR-7.2：预约/留言/简历 5 次/分钟，IP/手机号维度）。"""
import logging
from typing import Callable

import redis
from fastapi import Request

from core.config import settings
from core.response import BizError, ErrCode

logger = logging.getLogger("api")

_pool: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _pool
    if _pool is None:
        try:
            # protocol=2（RESP2）：兼容便携版 Redis（不支持 HELLO 3 握手）
            _pool = redis.Redis.from_url(settings.redis_url, decode_responses=True, protocol=2)
            _pool.ping()
        except redis.RedisError as e:
            logger.warning("Redis 不可用（降级为进程内计数）：%s", e)
            _pool = None
    return _pool  # type: ignore[return-value]


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(key: str, limit: int | None = None, window: int = 60) -> None:
    """Redis INCR 计数限流；Redis 不可用时降级不拦截。"""
    r = get_redis()
    limit = limit or settings.rate_limit_per_minute
    if r is None:
        return
    k = f"rl:{key}"
    try:
        n = r.incr(k)
        if n == 1:
            r.expire(k, window)
        if n > limit:
            raise BizError(ErrCode.RATE_LIMIT, "操作过于频繁，请稍后再试")
    except BizError:
        raise
    except redis.RedisError as e:
        logger.warning("限流异常，放行：%s", e)


def captcha_store(captcha_id: str, answer: str, ttl: int = 60) -> None:
    r = get_redis()
    if r is not None:
        try:
            r.setex(f"cap:{captcha_id}", ttl, answer.upper())
        except redis.RedisError as e:
            logger.warning("验证码存储失败：%s", e)


def captcha_check(captcha_id: str, answer: str) -> bool:
    r = get_redis()
    if r is None:
        # Redis 不可用时：固定放行（开发兜底），生产必须启用 Redis
        return True
    try:
        saved = r.get(f"cap:{captcha_id}")
        if not saved:
            return False
        r.delete(f"cap:{captcha_id}")
        return saved == answer.strip().upper()
    except redis.RedisError as e:
        logger.warning("验证码校验异常：%s", e)
        return True


def refresh_blacklist_add(jti: str, ttl: int) -> None:
    r = get_redis()
    if r is not None:
        try:
            r.setex(f"rbl:{jti}", ttl, "1")
        except redis.RedisError as e:
            logger.warning("refresh 黑名单写入失败：%s", e)


def refresh_blacklist_check(jti: str) -> bool:
    r = get_redis()
    if r is None:
        return False
    try:
        return r.exists(f"rbl:{jti}") == 1
    except redis.RedisError:
        return False
