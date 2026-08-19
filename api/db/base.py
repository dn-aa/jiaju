"""SQLAlchemy 基类与通用字段 Mixin（数据库设计文档 v2.3 §1.2 通用字段体系）。"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """全表统一通用字段：is_activate + 创建/修改人 + 创建/修改时间。"""

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    is_activate: Mapped[int] = mapped_column(default=1, server_default="1", comment="1激活/0禁用")

    created_at: Mapped[int | None] = mapped_column(BigInteger, comment="创建人(用户id)")
    created_date: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[int | None] = mapped_column(BigInteger, comment="修改人(用户id)")
    updated_date: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="修改时间"
    )
