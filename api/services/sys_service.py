# -*- coding: utf-8 -*-
"""【代码段功能】系统管理域（Sys）业务逻辑（阶段 4：BR-10）

账号：列表（角色/部门名称联查）/创建（初始密码 hash）/更新（回填）/禁用启用/
      删除（超管自身与 admin 保护）/重置密码（随机或自定义）
角色：列表/创建/更新（permissions JSON）
日志：列表（操作人/动作/关键字搜索 + 分页）
"""
import random
import string

from fastapi import Request
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode
from core.security import hash_password
from models.org import Department, OperationLog, Role, User

# 不可删除/禁用的内置账号（超管，PRD §10.1）
BUILTIN_ADMIN = "admin"


# ---------- 账号 ----------

def list_accounts(db: Session, *, page: int, page_size: int,
                  keyword: str | None) -> tuple[list[User], int]:
    """账号列表：关键字按用户名/姓名/手机号模糊搜索；返回用户对象（名称由路由补充）。"""
    q = db.query(User)
    if keyword:
        q = q.filter((User.username.like(f"%{keyword}%"))
                     | (User.real_name.like(f"%{keyword}%"))
                     | (User.phone.like(f"%{keyword}%")))
    total = q.count()
    users = q.order_by(User.id.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return users, total


def account_out(db: Session, user: User) -> dict:
    """账号出参：附加角色名/部门名（前端表格直接展示）。"""
    role = db.get(Role, user.role_id) if user.role_id else None
    dept = db.get(Department, user.dept_id) if user.dept_id else None
    return {
        "id": user.id, "username": user.username,
        "real_name": user.real_name, "nickname": user.nickname,
        "phone": user.phone, "email": user.email, "gender": user.gender,
        "position": user.position, "dept_id": user.dept_id, "role_id": user.role_id,
        "role_name": role.name if role else None,
        "dept_name": dept.name if dept else None,
        "is_activate": user.is_activate, "last_login_at": user.last_login_at,
        "created_date": user.created_date,
    }


def create_account(db: Session, payload: dict, user: User, request: Request) -> User:
    """创建账号：校验用户名唯一 + 初始密码必填（≥6 位，BR-10.1）。"""
    if db.query(User).filter(User.username == payload["username"]).first():
        raise BizError(ErrCode.VALIDATION, "登录名已存在")
    password = payload.pop("password", None)
    if not password:
        raise BizError(ErrCode.VALIDATION, "请设置初始密码（至少 6 位）")
    obj = User(
        **{**payload, "password_hash": hash_password(password)},
        created_at=user.id, updated_at=user.id,
    )
    db.add(obj)
    db.flush()
    _log(db, user, request, "sys:account", "创建账号", obj.id, f"账号 {obj.username}")
    db.commit()
    db.refresh(obj)
    return obj


def update_account(db: Session, account_id: int, payload: dict, user: User, request: Request) -> User:
    """更新账号：编辑回填保存；密码字段为空则不修改（需走重置密码）。"""
    obj = db.get(User, account_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "账号不存在")
    if obj.username == BUILTIN_ADMIN and payload.get("role_id") is not None and payload.get("role_id") != obj.role_id:
        raise BizError(ErrCode.VALIDATION, "内置超管账号不可变更角色")
    payload.pop("password", None)          # 密码只允许通过重置接口修改
    payload.pop("username", None)          # 登录名不可修改
    for k, v in payload.items():
        setattr(obj, k, v)
    obj.updated_at = user.id
    _log(db, user, request, "sys:account", "更新账号", obj.id, f"账号 {obj.username}")
    db.commit()
    db.refresh(obj)
    return obj


def delete_account(db: Session, account_id: int, user: User, request: Request) -> None:
    """删除账号：内置 admin 与当前登录账号不可删除（BR-10.1 保护）。"""
    obj = db.get(User, account_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "账号不存在")
    if obj.username == BUILTIN_ADMIN:
        raise BizError(ErrCode.VALIDATION, "内置超管账号不可删除")
    if obj.id == user.id:
        raise BizError(ErrCode.VALIDATION, "不能删除当前登录账号")
    name = obj.username
    db.delete(obj)
    _log(db, user, request, "sys:account", "删除账号", account_id, f"账号 {name}")
    db.commit()


def set_account_active(db: Session, account_id: int, active: bool, user: User, request: Request) -> None:
    """启用/禁用账号：禁用后该账号登录被拦截（login 校验 is_activate）。"""
    obj = db.get(User, account_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "账号不存在")
    if obj.username == BUILTIN_ADMIN and not active:
        raise BizError(ErrCode.VALIDATION, "内置超管账号不可禁用")
    if obj.id == user.id and not active:
        raise BizError(ErrCode.VALIDATION, "不能禁用当前登录账号")
    obj.is_activate = 1 if active else 0
    obj.updated_at = user.id
    _log(db, user, request, "sys:account", "禁用账号" if not active else "启用账号",
         account_id, f"账号 {obj.username}")
    db.commit()


def reset_password(db: Session, account_id: int, new_password: str | None,
                   user: User, request: Request) -> str:
    """重置密码：自定义（≥6 位）或随机生成 8 位（BR-10.1）。返回新密码（随机时展示）。"""
    obj = db.get(User, account_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "账号不存在")
    if new_password:
        if len(new_password) < 6:
            raise BizError(ErrCode.VALIDATION, "密码至少 6 位")
        pwd = new_password
    else:
        pwd = "".join(random.choices(string.ascii_letters + string.digits, k=8))
    obj.password_hash = hash_password(pwd)
    obj.updated_at = user.id
    _log(db, user, request, "sys:account", "重置密码", account_id, f"账号 {obj.username}")
    db.commit()
    return pwd


# ---------- 角色 ----------

def list_roles(db: Session) -> list[Role]:
    """角色列表（全部，供角色管理与账号表单下拉）。"""
    return db.query(Role).order_by(Role.id.asc()).all()


def create_role(db: Session, payload: dict, user: User, request: Request) -> Role:
    """创建角色：校验名称唯一 + 权限集合入库（JSON）。"""
    if db.query(Role).filter(Role.name == payload["name"]).first():
        raise BizError(ErrCode.VALIDATION, "角色名已存在")
    obj = Role(**payload, created_at=user.id, updated_at=user.id)
    db.add(obj)
    db.flush()
    _log(db, user, request, "sys:role", "创建角色", obj.id, f"角色 {obj.name}")
    db.commit()
    db.refresh(obj)
    return obj


def update_role(db: Session, role_id: int, payload: dict, user: User, request: Request) -> Role:
    """更新角色：名称/描述/权限集合（权限树勾选结果整体保存）。"""
    obj = db.get(Role, role_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "角色不存在")
    for k, v in payload.items():
        setattr(obj, k, v)
    obj.updated_at = user.id
    _log(db, user, request, "sys:role", "更新角色", obj.id, f"角色 {obj.name} 权限 {len(payload.get('permissions', []))} 项")
    db.commit()
    db.refresh(obj)
    return obj


def delete_role(db: Session, role_id: int, user: User, request: Request) -> None:
    """删除角色：内置超管（permissions=["*"]）不可删；被账号引用时禁止删除（保持 RBAC 完整性）。"""
    obj = db.get(Role, role_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "角色不存在")
    if obj.permissions and "*" in obj.permissions:
        raise BizError(ErrCode.VALIDATION, "内置超管角色不可删除")
    if db.query(User).filter(User.role_id == role_id).count() > 0:
        raise BizError(ErrCode.VALIDATION, "该角色已分配给账号，请先调整账号角色")
    name = obj.name
    db.delete(obj)
    _log(db, user, request, "sys:role", "删除角色", role_id, f"角色 {name}")
    db.commit()


# ---------- 操作日志 ----------

def list_logs(db: Session, *, page: int, page_size: int, keyword: str | None) -> tuple[list[OperationLog], int]:
    """操作日志列表：关键字按操作人/动作/详情模糊搜索（BR-10.3）。"""
    q = db.query(OperationLog)
    if keyword:
        q = q.filter((OperationLog.operator_name.like(f"%{keyword}%"))
                     | (OperationLog.action.like(f"%{keyword}%"))
                     | (OperationLog.detail.like(f"%{keyword}%")))
    total = q.count()
    logs = q.order_by(OperationLog.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return logs, total


# ---------- 工具 ----------

def _log(db: Session, user: User, request: Request, action: str,
         label: str, object_id: int | None, detail: str = "") -> None:
    """写操作日志（与 cms_service.write_log 同构）。"""
    db.add(OperationLog(
        operator_id=user.id,
        operator_name=user.real_name or user.username,
        action=action, object_type="sys", object_id=object_id,
        detail=f"{label}：{detail}"[:1000],
        ip=request.client.host if request.client else None,
    ))
    db.flush()
