"""通用 Schema：分页参数/结果、登录、Token、用户等。"""
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


# ---------- 分页 ----------
class PageQuery(BaseModel):
    page: int = Field(1, ge=1, description="页码（从 1 开始）")
    page_size: int = Field(12, ge=1, le=50, description="每页条数（默认 12，上限 50）")
    sort: str | None = Field(None, description="排序，如 sort,desc")


class Pagination(BaseModel):
    total: int
    page: int
    page_size: int
    pages: int


class PageResult(BaseModel, Generic[T]):
    list: list[T]
    pagination: Pagination


# ---------- 认证 ----------
class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    real_name: str | None = None
    nickname: str | None = None
    phone: str | None = None
    email: str | None = None
    gender: int = 0
    position: str | None = None
    dept_id: int | None = None
    role_id: int | None = None
    avatar: str | None = None
    last_login_at: datetime | None = None


class LoginOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserBrief


class ChangePasswordIn(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128, description="新密码 ≥6 位")


class RefreshIn(BaseModel):
    refresh_token: str


class MenuItem(BaseModel):
    key: str
    label: str
    path: str | None = None
    icon: str | None = None
    perms: list[str] = []
    children: list["MenuItem"] = []
