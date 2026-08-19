# -*- coding: utf-8 -*-
"""【代码段功能】系统管理域（Sys）Schema（阶段 4：BR-10）

覆盖账号/角色/操作日志三类资源的出入参；权限编码与菜单权限一致（附录 E）。
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- 账号（users 表，BR-10.1） ----------

class AccountIn(BaseModel):
    """新增/编辑账号：创建时需密码；编辑时密码留空则不修改。"""
    username: str = Field(min_length=2, max_length=64, description="登录名（唯一，创建后不可改）")
    real_name: Optional[str] = Field(None, max_length=64, description="姓名")
    nickname: Optional[str] = Field(None, max_length=64, description="昵称")
    phone: Optional[str] = Field(None, max_length=32)
    email: Optional[str] = Field(None, max_length=128)
    gender: int = 0
    position: Optional[str] = Field(None, max_length=64)
    dept_id: Optional[int] = None
    role_id: int = Field(description="角色 id（决定菜单/操作权限）")
    password: Optional[str] = Field(None, min_length=6, max_length=128,
                                    description="初始密码（创建必填 ≥6 位；编辑留空不改）")


class AccountOut(BaseModel):
    """账号列表/详情（含角色与部门名称，便于前端展示）。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    real_name: Optional[str] = None
    nickname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: int = 0
    position: Optional[str] = None
    dept_id: Optional[int] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    dept_name: Optional[str] = None
    is_activate: int = 1
    last_login_at: Optional[datetime] = None
    created_date: Optional[datetime] = None


class ResetPwdIn(BaseModel):
    """重置密码：new_password 为空时后端生成随机密码并返回。"""
    new_password: Optional[str] = Field(None, min_length=6, max_length=128)


# ---------- 角色（roles 表，BR-10.2） ----------

class RoleIn(BaseModel):
    """角色新增/编辑：权限集合 permissions（含"*"=超管）。"""
    name: str = Field(min_length=1, max_length=64)
    permissions: list[str] = Field(default_factory=list, description="权限编码集合（超管为 [\"*\"]）")


class RoleOut(BaseModel):
    """角色列表/详情。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    permissions: list[str] = Field(default_factory=list)
    created_date: Optional[datetime] = None


# ---------- 操作日志（operation_logs 表，BR-10.3） ----------

class LogOut(BaseModel):
    """操作日志记录。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    operator_id: int
    operator_name: str
    action: str
    object_type: str
    object_id: Optional[int] = None
    detail: Optional[str] = None
    ip: Optional[str] = None
    created_date: Optional[datetime] = None
