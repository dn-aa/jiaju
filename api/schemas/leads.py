# -*- coding: utf-8 -*-
"""【代码段功能】线索域（Leads）Schema（阶段 3：BR-5.2 / BR-7 / BR-8）

覆盖三类线索：预约 appointments / 留言 messages / 简历投递 applications。
Out 结构对列表做脱敏处理（姓名/手机号），详情接口返回完整字段。
"""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class AppointmentOut(BaseModel):
    """预约（BR-7）：列表展示脱敏姓名/手机号，详情完整。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    appointment_date: date
    slot: Optional[str] = None
    note: Optional[str] = None
    status: str                    # pending/contacted/done/cancelled
    created_date: Optional[datetime] = None
    processed_by: Optional[int] = None
    processed_at: Optional[datetime] = None


class MessageOut(BaseModel):
    """留言（BR-8）：列表脱敏，详情完整。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    contact: str
    content: str
    status: str                    # unread/read/done
    created_date: Optional[datetime] = None
    processed_by: Optional[int] = None
    processed_at: Optional[datetime] = None


class ApplicationOut(BaseModel):
    """简历投递（BR-5.2）：列表脱敏，详情含校招/社招专属字段与附件。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    name: str
    phone: str
    email: Optional[str] = None
    intro: Optional[str] = None
    attachment: Optional[str] = None
    school: Optional[str] = None
    education: Optional[str] = None
    major: Optional[str] = None
    grad_at: Optional[str] = None
    work_years: Optional[int] = None
    current_title: Optional[str] = None
    status: str                    # pending/viewed/contacted/rejected
    created_date: Optional[datetime] = None
    processed_by: Optional[int] = None
    processed_at: Optional[datetime] = None


class LeadStatusIn(BaseModel):
    """线索状态流转入参：目标状态 + 处理备注（备注随操作日志留痕）。"""
    status: str = Field(description="目标状态（按线索类型枚举）")
    note: Optional[str] = Field(None, max_length=500, description="跟进备注（写入操作日志）")


# 各类线索的合法状态枚举（开发技术文档 v1.4 §7.1 状态机）
APPOINTMENT_STATUS = {"pending", "contacted", "done", "cancelled"}
MESSAGE_STATUS = {"unread", "read", "done"}
APPLICATION_STATUS = {"pending", "viewed", "contacted", "rejected"}
