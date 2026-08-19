"""认证路由（BR-1）：/api/auth/*。"""
import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.limiter import client_ip, rate_limit
from core.response import BizError, ErrCode, ok
from db.session import get_db
from deps.auth import CurrentUser
from models.org import User
from schemas.common import ChangePasswordIn, LoginIn, LoginOut, RefreshIn, TokenOut, UserBrief
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
def me(user: CurrentUser):
    return ok(UserBrief.model_validate(user).model_dump())


@router.get("/menus")
def menus(user: CurrentUser):
    return ok([m.model_dump() for m in auth_service.build_menus(user)])


@router.post("/change-password")
def change_password(body: ChangePasswordIn, user: CurrentUser, db: Session = Depends(get_db)):
    auth_service.change_password(db, user, body.old_password, body.new_password)
    return ok(message="密码修改成功")
