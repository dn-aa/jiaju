"""认证业务逻辑（BR-1）：登录、退出、刷新、改密、菜单权限构建。"""
from datetime import datetime

from sqlalchemy.orm import Session

from core.limiter import refresh_blacklist_add, refresh_blacklist_check
from core.response import BizError, ErrCode
from core.security import (
    create_access_token, create_refresh_token, decode_token,
    hash_password, verify_password,
)
from deps.auth import match_permission
from models.org import Role, User
from schemas.common import LoginOut, MenuItem, TokenOut, UserBrief

# ---------- 菜单定义（PRD §8 角色权限矩阵 / 开发技术文档附录 E） ----------
MENU_TREE: list[MenuItem] = [
    MenuItem(key="dashboard", label="工作台", path="/dashboard", perms=["dashboard:view"]),
    MenuItem(key="content", label="内容管理", children=[
        MenuItem(key="product", label="产品", path="/content/product", perms=["product:view"]),
        MenuItem(key="case", label="案例", path="/content/case", perms=["case:view"]),
        MenuItem(key="article", label="新闻", path="/content/article", perms=["article:view"]),
        MenuItem(key="page", label="页面内容·Banner", path="/content/page", perms=["content:view"]),
    ]),
    MenuItem(key="recruit", label="招聘管理", children=[
        MenuItem(key="job", label="职位", path="/recruit/job", perms=["job:view"]),
        MenuItem(key="application", label="简历投递", path="/recruit/application", perms=["leads:application"]),
    ]),
    MenuItem(key="leads", label="线索管理", children=[
        MenuItem(key="appointment", label="在线预约", path="/leads/appointment", perms=["leads:appointment"]),
        MenuItem(key="message", label="留言咨询", path="/leads/message", perms=["leads:message"]),
    ]),
    MenuItem(key="sys", label="系统管理", children=[
        MenuItem(key="account", label="账号管理", path="/sys/account", perms=["sys:account"]),
        MenuItem(key="role", label="角色管理", path="/sys/role", perms=["sys:role"]),
        MenuItem(key="log", label="操作日志", path="/sys/log", perms=["sys:log"]),
    ]),
]


def _filter_menu(items: list[MenuItem], perms: list) -> list[MenuItem]:
    out = []
    for it in items:
        if it.perms and not any(match_permission(p, perms) for p in it.perms):
            continue
        if it.children:
            children = _filter_menu(it.children, perms)
            if children:
                out.append(it.model_copy(update={"children": children}))
        else:
            out.append(it)
    return out


def user_brief(db: Session, user: User) -> UserBrief:
    """构建用户信息（附带角色权限集合，供前端按钮级权限 Auth 使用）。"""
    role = db.get(Role, user.role_id) if user.role_id else None
    brief = UserBrief.model_validate(user)
    brief.permissions = role.permissions if role else []
    return brief


def login(db: Session, username: str, password: str) -> LoginOut:
    user = db.query(User).filter(User.username == username).first()
    # 统一模糊报错，不泄露用户是否存在
    if user is None or not verify_password(password, user.password_hash):
        raise BizError(ErrCode.VALIDATION, "用户名或密码错误")
    if user.is_activate != 1:
        raise BizError(ErrCode.VALIDATION, "账号已被禁用，请联系管理员")
    user.last_login_at = datetime.now()
    db.commit()
    return LoginOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=user_brief(db, user),
    )


def logout(refresh_token: str) -> None:
    payload = decode_token(refresh_token, "refresh")
    refresh_blacklist_add(payload["jti"], 7 * 24 * 3600)


def refresh(db: Session, refresh_token: str) -> TokenOut:
    payload = decode_token(refresh_token, "refresh")
    if refresh_blacklist_check(payload["jti"]):
        raise BizError(ErrCode.UNAUTH, "登录凭证已失效，请重新登录", http_status=401)
    user = db.get(User, int(payload["sub"]))
    if user is None or user.is_activate != 1:
        raise BizError(ErrCode.UNAUTH, "账号不存在或已禁用", http_status=401)
    # 轮换：旧 refresh 加入黑名单，签发新对
    refresh_blacklist_add(payload["jti"], 7 * 24 * 3600)
    return TokenOut(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


def change_password(db: Session, user: User, old_password: str, new_password: str) -> None:
    if not verify_password(old_password, user.password_hash):
        raise BizError(ErrCode.VALIDATION, "原密码不正确")
    user.password_hash = hash_password(new_password)
    db.commit()


def build_menus(db: Session, user: User) -> list[MenuItem]:
    """按角色权限过滤菜单树（RBAC，PRD §8）。

    说明：用户-角色为逻辑外键（无 ORM relationship），此处显式查询角色权限集合；
    超管角色 permissions=["*"] 时 _filter_menu 会放行全部菜单。"""
    role = db.get(Role, user.role_id) if user.role_id else None
    perms = role.permissions if role else []
    return _filter_menu(MENU_TREE, perms or [])
