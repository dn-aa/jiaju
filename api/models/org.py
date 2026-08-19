"""组织域 Models：users / departments / roles / operation_logs。
对齐数据库设计文档 v2.3：逻辑外键 + 索引策略（无物理 FK、无 ORM relationship）。"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, Integer, String
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from db.base import TimestampMixin, Base


class Department(TimestampMixin, Base):
    __tablename__ = "departments"
    __table_args__ = (Index("idx_parent", "parent_id"),)

    name: Mapped[str] = mapped_column(String(64), comment="部门名称")
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0", comment="上级部门(0=顶级)")


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(64), comment="角色名称")
    permissions: Mapped[list | None] = mapped_column(JSON, comment="权限编码集合(RBAC)")


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("uk_username", "username", unique=True),
        Index("idx_phone", "phone"),
        Index("idx_dept", "dept_id"),
        Index("idx_role", "role_id"),
    )

    username: Mapped[str] = mapped_column(String(64), comment="用户名（登录名，唯一）")
    real_name: Mapped[str | None] = mapped_column(String(64), comment="姓名")
    nickname: Mapped[str | None] = mapped_column(String(64), comment="昵称")
    phone: Mapped[str | None] = mapped_column(String(32), comment="手机号")
    email: Mapped[str | None] = mapped_column(String(128), comment="邮箱")
    gender: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="性别 0未知/1男/2女")
    position: Mapped[str | None] = mapped_column(String(64), comment="岗位")
    dept_id: Mapped[int | None] = mapped_column(BigInteger, comment="部门编号（逻辑 FK→departments.id）")
    role_id: Mapped[int] = mapped_column(BigInteger, comment="角色编号（逻辑 FK→roles.id）")
    password_hash: Mapped[str] = mapped_column(String(255), comment="登录密码(bcrypt)")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, comment="最近登录时间")
    avatar: Mapped[str | None] = mapped_column(String(512), comment="头像 URL（BR-1.4 上传，后台顶栏展示）")


class OperationLog(TimestampMixin, Base):
    __tablename__ = "operation_logs"
    __table_args__ = (
        Index("idx_operator", "operator_id"),
        Index("idx_action", "action"),
        Index("idx_created", "created_date"),
    )

    operator_id: Mapped[int | None] = mapped_column(BigInteger, comment="操作人 id（逻辑 FK→users.id）")
    operator_name: Mapped[str | None] = mapped_column(String(64), comment="操作人名称")
    action: Mapped[str] = mapped_column(String(64), comment="动作编码")
    object_type: Mapped[str | None] = mapped_column(String(64), comment="对象类型")
    object_id: Mapped[int | None] = mapped_column(BigInteger, comment="对象 id")
    detail: Mapped[str | None] = mapped_column(String(1024), comment="详情")
    ip: Mapped[str | None] = mapped_column(String(64), comment="来源 IP")
