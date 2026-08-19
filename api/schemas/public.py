# -*- coding: utf-8 -*-
"""【代码段功能】公开域（前台）提交表单 Schema（阶段 5）

覆盖：在线预约 / 通用留言 / 简历投递（附件走 multipart，其余字段在此定义）。
所有提交接口均要求图形验证码（FR-7.2），captcha_enabled=False 时跳过校验。
"""
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class CaptchaMixin(BaseModel):
    """验证码公共字段。"""
    captcha_id: str = Field(min_length=1, description="验证码 id（GET /api/public/captcha 返回）")
    captcha_code: str = Field(min_length=4, max_length=4, description="验证码答案（4 位）")


class AppointmentIn(CaptchaMixin):
    """在线预约（BR-7.1）：姓名/手机号/日期/时段/备注。"""
    name: str = Field(min_length=1, max_length=64)
    phone: str = Field(min_length=7, max_length=32, description="手机号")
    appointment_date: date = Field(description="预约日期（>= 今天，前端限制）")
    slot: Optional[str] = Field(None, max_length=20, description="时段（来自 site_config 预约时段）")
    note: Optional[str] = Field(None, max_length=500, description="预约备注（XSS 清洗）")


class MessageIn(CaptchaMixin):
    """通用留言（BR-8.1）：姓名/联系方式/留言内容。"""
    name: str = Field(min_length=1, max_length=64)
    contact: str = Field(min_length=7, max_length=128, description="手机号/邮箱等联系方式")
    content: str = Field(min_length=1, max_length=500, description="留言内容（XSS 清洗）")


class ApplicationIn(CaptchaMixin):
    """简历投递（BR-5.2）：附件由 multipart 上传；按岗位类型填校招/社招字段。"""
    job_id: int = Field(description="应聘职位 id")
    name: str = Field(min_length=1, max_length=64)
    phone: str = Field(min_length=7, max_length=32)
    email: Optional[str] = Field(None, max_length=128)
    intro: Optional[str] = Field(None, max_length=1000, description="个人简介（XSS 清洗）")
    # 校招字段
    school: Optional[str] = Field(None, max_length=128)
    education: Optional[str] = Field(None, max_length=32)
    major: Optional[str] = Field(None, max_length=128)
    grad_at: Optional[str] = Field(None, max_length=32)
    # 社招字段
    work_years: Optional[int] = Field(None, ge=0, le=60)
    current_title: Optional[str] = Field(None, max_length=64)
