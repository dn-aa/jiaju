"""认证路由（BR-1）：/api/auth/*。"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.limiter import client_ip, rate_limit
from core.response import ok
from db.session import get_db
from deps.auth import CurrentUser
from schemas.common import ChangePasswordIn, LoginIn, LoginOut, RefreshIn, TokenOut
from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    rate_limit(f"login:{client_ip(request)}")
    data: LoginOut = auth_service.login(db, body.username, body.password)
    return ok(data.model_dump())


@router.post("/logout")
def logout(body: RefreshIn):
    auth_service.logout(body.refresh_token)
    return ok(message="已退出登录")


@router.post("/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    return ok(auth_service.refresh(db, body.refresh_token).model_dump())


@router.get("/me")
def me(user: CurrentUser, db: Session = Depends(get_db)):
    # 返回当前用户信息（含角色权限集合，供按钮级权限控制）
    return ok(auth_service.user_brief(db, user).model_dump())


@router.get("/menus")
def menus(user: CurrentUser, db: Session = Depends(get_db)):
    # 按角色权限过滤菜单（BR-1.2 RBAC）：无权限菜单不返回，前端不渲染
    return ok([m.model_dump() for m in auth_service.build_menus(db, user)])


@router.post("/change-password")
def change_password(body: ChangePasswordIn, user: CurrentUser, db: Session = Depends(get_db)):
    auth_service.change_password(db, user, body.old_password, body.new_password)
    return ok(message="密码修改成功")
