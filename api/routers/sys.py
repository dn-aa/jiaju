# -*- coding: utf-8 -*-
"""【代码段功能】系统管理路由（阶段 4：BR-10，全部需超管权限 sys:*）

账号：
  GET    /api/sys/accounts            账号列表（关键字/分页）
  POST   /api/sys/accounts            创建账号（初始密码）
  PUT    /api/sys/accounts/{id}       更新账号（编辑回填）
  DELETE /api/sys/accounts/{id}       删除账号（admin 与当前账号保护）
  PUT    /api/sys/accounts/{id}/status 启用/禁用
  POST   /api/sys/accounts/{id}/reset-pwd 重置密码（自定义或随机）
角色：
  GET    /api/sys/roles               角色列表
  POST   /api/sys/roles               创建角色
  PUT    /api/sys/roles/{id}          更新角色（权限树勾选保存）
操作日志：
  GET    /api/sys/logs                日志列表（关键字/分页）
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.response import ok
from db.session import get_db
from deps.auth import require_perm
from schemas.sys import AccountIn, LogOut, ResetPwdIn, RoleIn
from services import sys_service

router = APIRouter(prefix="/api/sys", tags=["sys"])

# 仅超管可用：权限编码 sys:account / sys:role / sys:log（超管 "*" 通配放行）
view_account = require_perm("sys:account")
view_role = require_perm("sys:role")
view_log = require_perm("sys:log")


class AccountStatusIn(BaseModel):
    """启用/禁用入参。"""
    active: bool


# ---------- 账号 ----------

@router.get("/accounts")
def list_accounts(page: int = 1, page_size: int = 10, keyword: str | None = None,
                  db: Session = Depends(get_db), user=Depends(view_account)):
    """账号列表：返回角色名/部门名（前端直接展示）。"""
    users, total = sys_service.list_accounts(db, page=page, page_size=page_size, keyword=keyword)
    return ok({
        "list": [sys_service.account_out(db, u) for u in users],
        "pagination": {"total": total, "page": page, "page_size": page_size,
                       "pages": (total + page_size - 1) // page_size},
    })


@router.post("/accounts")
def create_account(payload: AccountIn, request: Request, db: Session = Depends(get_db),
                   user=Depends(view_account)):
    """创建账号：初始密码 hash 入库，新增后即时上列表。"""
    obj = sys_service.create_account(db, payload.model_dump(), user, request)
    return ok(sys_service.account_out(db, obj))


@router.put("/accounts/{account_id}")
def update_account(account_id: int, payload: AccountIn, request: Request,
                   db: Session = Depends(get_db), user=Depends(view_account)):
    """更新账号：编辑表单回填保存（密码与登录名不由此接口修改）。"""
    obj = sys_service.update_account(db, account_id, payload.model_dump(), user, request)
    return ok(sys_service.account_out(db, obj))


@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, request: Request, db: Session = Depends(get_db),
                   user=Depends(view_account)):
    """删除账号：内置 admin 与当前登录账号后端保护。"""
    sys_service.delete_account(db, account_id, user, request)
    return ok(message="删除成功")


@router.put("/accounts/{account_id}/status")
def set_account_active(account_id: int, body: AccountStatusIn, request: Request,
                       db: Session = Depends(get_db), user=Depends(view_account)):
    """启用/禁用账号：禁用后登录被拦截。"""
    sys_service.set_account_active(db, account_id, body.active, user, request)
    return ok({"id": account_id, "active": body.active}, message="状态已更新")


@router.post("/accounts/{account_id}/reset-pwd")
def reset_pwd(account_id: int, body: ResetPwdIn, request: Request,
              db: Session = Depends(get_db), user=Depends(view_account)):
    """重置密码：自定义新密码或随机生成（返回随机密码供超管转交）。"""
    pwd = sys_service.reset_password(db, account_id, body.new_password, user, request)
    return ok({"id": account_id, "new_password": pwd}, message="密码已重置")


# ---------- 角色 ----------

@router.get("/roles")
def list_roles(db: Session = Depends(get_db), user=Depends(view_role)):
    """角色列表（含权限集合，供权限配置回填）。"""
    roles = sys_service.list_roles(db)
    return ok([{
        "id": r.id, "name": r.name,
        "permissions": r.permissions or [],
        "created_date": r.created_date.isoformat() if r.created_date else None,
    } for r in roles])


@router.post("/roles")
def create_role(payload: RoleIn, request: Request, db: Session = Depends(get_db),
                user=Depends(view_role)):
    """创建角色：权限集合（权限树勾选结果）整体入库。"""
    obj = sys_service.create_role(db, payload.model_dump(), user, request)
    return ok({"id": obj.id, "name": obj.name, "permissions": obj.permissions or []})


@router.put("/roles/{role_id}")
def update_role(role_id: int, payload: RoleIn, request: Request, db: Session = Depends(get_db),
                user=Depends(view_role)):
    """更新角色：名称/权限集合（勾选保存后即时生效）。"""
    obj = sys_service.update_role(db, role_id, payload.model_dump(), user, request)
    return ok({"id": obj.id, "name": obj.name, "permissions": obj.permissions or []})


@router.delete("/roles/{role_id}")
def delete_role(role_id: int, request: Request, db: Session = Depends(get_db),
                user=Depends(view_role)):
    """删除角色：内置超管不可删；已被账号引用时后端拦截。"""
    sys_service.delete_role(db, role_id, user, request)
    return ok(message="删除成功")


# ---------- 操作日志 ----------

@router.get("/logs")
def list_logs(page: int = 1, page_size: int = 20, keyword: str | None = None,
              db: Session = Depends(get_db), user=Depends(view_log)):
    """操作日志列表：全部后台写操作留痕（BR-10.3）。"""
    logs, total = sys_service.list_logs(db, page=page, page_size=page_size, keyword=keyword)
    return ok({
        "list": [LogOut.model_validate(l).model_dump() for l in logs],
        "pagination": {"total": total, "page": page, "page_size": page_size,
                       "pages": (total + page_size - 1) // page_size},
    })
