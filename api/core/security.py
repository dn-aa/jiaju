"""认证安全：bcrypt 密码 + JWT 双 Token（access 30min / refresh 7d，服务端轮换+黑名单）。"""
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from core.config import settings
from core.response import BizError, ErrCode

PASSWORD_COST = 12


# ---------- 密码 ----------
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=PASSWORD_COST)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


# ---------- JWT ----------
def _create_token(user_id: int, token_type: str, ttl: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int) -> str:
    return _create_token(user_id, "access", settings.jwt_access_ttl)


def create_refresh_token(user_id: int) -> str:
    return _create_token(user_id, "refresh", settings.jwt_refresh_ttl)


def decode_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise BizError(ErrCode.UNAUTH, "登录已过期，请重新登录", http_status=401)
    except jwt.InvalidTokenError:
        raise BizError(ErrCode.UNAUTH, "无效的登录凭证", http_status=401)
    if payload.get("type") != expected_type:
        raise BizError(ErrCode.UNAUTH, "凭证类型不符", http_status=401)
    return payload
