"""线索域 Models：applications（简历投递）/ appointments（预约）/ messages（留言）。
对齐数据库设计文档 v2.3：逻辑外键 + 索引策略（无物理 FK）。"""
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from db.base import TimestampMixin, Base


class Application(TimestampMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (
        Index("idx_job", "job_id"),
        Index("idx_phone", "phone"),
        Index("idx_status", "status"),
        Index("idx_processed", "processed_by"),
    )

    job_id: Mapped[int] = mapped_column(BigInteger, comment="应聘职位（逻辑 FK→jobs.id）")
    name: Mapped[str] = mapped_column(String(64), comment="姓名")
    phone: Mapped[str] = mapped_column(String(32), comment="手机号")
    email: Mapped[str | None] = mapped_column(String(128), comment="邮箱")
    intro: Mapped[str | None] = mapped_column(String(1024), comment="个人简介")
    attachment: Mapped[str | None] = mapped_column(String(512), comment="简历附件 URL")
    school: Mapped[str | None] = mapped_column(String(128), comment="学校（校招）")
    education: Mapped[str | None] = mapped_column(String(32), comment="学历（校招）")
    major: Mapped[str | None] = mapped_column(String(128), comment="专业（校招）")
    grad_at: Mapped[str | None] = mapped_column(String(32), comment="毕业时间（校招）")
    work_years: Mapped[int | None] = mapped_column(Integer, comment="工作年限（社招）")
    current_title: Mapped[str | None] = mapped_column(String(64), comment="当前职位（社招）")
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending",
                                        comment="业务状态：pending/viewed/contacted/rejected")
    processed_by: Mapped[int | None] = mapped_column(BigInteger, comment="处理人（逻辑 FK→users.id）")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, comment="处理时间")


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"
    __table_args__ = (
        Index("idx_phone", "phone"),
        Index("idx_status", "status"),
        Index("idx_date", "appointment_date"),
        Index("idx_processed", "processed_by"),
    )

    name: Mapped[str] = mapped_column(String(64), comment="姓名")
    phone: Mapped[str] = mapped_column(String(32), comment="手机号")
    appointment_date: Mapped[date] = mapped_column(Date, comment="预约日期")
    slot: Mapped[str | None] = mapped_column(String(20), comment="时段")
    note: Mapped[str | None] = mapped_column(String(1024), comment="备注")
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending",
                                        comment="业务状态：pending/contacted/done/cancelled")
    processed_by: Mapped[int | None] = mapped_column(BigInteger, comment="处理人（逻辑 FK→users.id）")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, comment="处理时间")


class Message(TimestampMixin, Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("idx_status", "status"),
        Index("idx_processed", "processed_by"),
    )

    name: Mapped[str] = mapped_column(String(64), comment="姓名")
    contact: Mapped[str] = mapped_column(String(128), comment="联系方式")
    content: Mapped[str] = mapped_column(String(1024), comment="留言内容")
    status: Mapped[str] = mapped_column(String(20), default="unread", server_default="unread",
                                        comment="业务状态：unread/read/done")
    processed_by: Mapped[int | None] = mapped_column(BigInteger, comment="处理人（逻辑 FK→users.id）")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, comment="处理时间")
