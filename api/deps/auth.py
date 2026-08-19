"""deps：DB 会话 / 当前用户 / 权限依赖（require_perm）。"""
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from core.limiter import refresh_blacklist_check
from core.response import BizError, ErrCode
from core.security import decode_token
from db.session import get_db  # noqa: F401
from models.org import Role, User


def _authenticate(request: Request, db: Session) -> tuple[User, dict]:
    """解析 Bearer access token → 返回 (user, payload)。"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise BizError(ErrCode.UNAUTH, "未登录或登录已失效", http_status=401)
    payload = decode_token(auth[7:], "access")
    user = db.get(User, int(payload["sub"]))
    if user is None or user.is_activate != 1:
        raise BizError(ErrCode.UNAUTH, "账号不存在或已禁用", http_status=401)
    return user, payload


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """当前登录用户（已登录即可用）。"""
    user, _ = _authenticate(request, db)
    return user


def require_perm(code: str) -> Callable:
    """权限依赖工厂：校验当前用户角色是否含指定权限编码。

    说明：用户-角色为逻辑外键，需显式查询 roles 表获取 permissions JSON。"""

    def dep(request: Request, db: Session = Depends(get_db)) -> User:
        user, _ = _authenticate(request, db)
        # 显式查询角色权限集合（无 ORM relationship）
        role = db.get(Role, user.role_id) if user.role_id else None
        perms = role.permissions if role else []
        if not match_permission(code, perms or []):
            raise BizError(ErrCode.FORBIDDEN, "无操作权限", http_status=403)
        return user

    return dep


def match_permission(required: str, permissions: list) -> bool:
    """权限匹配：超管 * 或精确/前缀通配（content:* 匹配 content:view）。"""
    for p in permissions or []:
        p = str(p)
        if p == "*" or p == required:
            return True
        if p.endswith(":*") and required.startswith(p[:-1]):
            return True
    return False


def check_refresh_not_blacklisted(jti: str) -> None:
    if refresh_blacklist_check(jti):
        raise BizError(ErrCode.UNAUTH, "登录凭证已失效，请重新登录", http_status=401)


CurrentUser = Annotated[User, Depends(get_current_user)]
