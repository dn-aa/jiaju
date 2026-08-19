# -*- coding: utf-8 -*-
"""【代码段功能】线索域（Leads）业务逻辑（阶段 3：BR-5.2 / BR-7 / BR-8）

覆盖：
  - 三类线索（预约/留言/简历）列表查询：筛选（状态/时间/关键字）+ 分页 + 脱敏
  - 状态流转：校验合法状态 → 更新处理人/处理时间 → 备注写入操作日志（BR-7.3/8.3）
  - 个人信息脱敏：列表姓名/手机号打码（NFR-3 / 数据库文档 §8.1），详情完整
"""
from datetime import datetime

from fastapi import Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode
from models.leads import Application, Appointment, Message
from models.org import OperationLog, User
from schemas.leads import (
    APPLICATION_STATUS, APPOINTMENT_STATUS, MESSAGE_STATUS,
    ApplicationOut, AppointmentOut, MessageOut,
)

# 线索类型 → (模型, 合法状态集, 权限编码, 日志对象名)
LEAD_TYPES: dict[str, dict] = {
    "appointments": {"model": Appointment, "statuses": APPOINTMENT_STATUS,
                     "perm": "leads:appointment", "label": "预约"},
    "messages": {"model": Message, "statuses": MESSAGE_STATUS,
                 "perm": "leads:message", "label": "留言"},
    "applications": {"model": Application, "statuses": APPLICATION_STATUS,
                     "perm": "leads:application", "label": "简历"},
}


# ---------- 脱敏（个人信息最小化暴露，数据库文档 v2.3 §8.1） ----------

def mask_name(name: str | None) -> str:
    """姓名脱敏：保留首字，其余打码（张**）。"""
    if not name:
        return ""
    if len(name) <= 1:
        return name + "*"
    return name[0] + "*" * (len(name) - 1)


def mask_phone(phone: str | None) -> str:
    """手机号脱敏：前 3 后 4，中间打码（138****8821）。"""
    if not phone:
        return ""
    if len(phone) < 7:
        return phone[:1] + "****"
    return phone[:3] + "****" + phone[-4:]


# ---------- 列表查询（筛选 + 分页 + 脱敏） ----------

def list_leads(db: Session, lead_type: str, *, status: str | None,
               keyword: str | None, page: int, page_size: int) -> tuple[list, int]:
    """【代码段功能】三类线索通用列表查询。
    - status：状态筛选（空=全部）
    - keyword：按姓名/手机号模糊搜索（客服检索客户用）
    - 返回按创建时间倒序 + 分页"""
    cfg = LEAD_TYPES[lead_type]
    model = cfg["model"]
    q = db.query(model)
    if status:
        q = q.filter(model.status == status)
    if keyword:
        # 联系方式字段：留言表为 contact，其余为 phone（与数据库文档 v2.3 一致）
        contact_field = getattr(model, "phone", None) or getattr(model, "contact")
        q = q.filter((model.name.like(f"%{keyword}%")) | (contact_field.like(f"%{keyword}%")))
    total = q.count()
    items = q.order_by(model.created_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def lead_to_out(lead_type: str, obj, masked: bool = True) -> dict:
    """【代码段功能】将 ORM 对象转为 Out dict。
    - masked=True（列表）：姓名/手机号/联系方式脱敏（NFR-3）
    - masked=False（详情）：返回完整信息（授权角色可见，操作留痕）"""
    schemas = {
        "appointments": AppointmentOut,
        "messages": MessageOut,
        "applications": ApplicationOut,
    }
    data = schemas[lead_type].model_validate(obj).model_dump()
    if not masked:
        return data
    if lead_type == "appointments":
        data["name"] = mask_name(data["name"])
        data["phone"] = mask_phone(data["phone"])
    elif lead_type == "messages":
        data["name"] = mask_name(data["name"])
        data["contact"] = mask_phone(data["contact"]) if len(data["contact"] or "") >= 7 else mask_name(data["contact"])
    else:  # applications
        data["name"] = mask_name(data["name"])
        data["phone"] = mask_phone(data["phone"])
    return data


# ---------- 状态流转（含备注留痕） ----------

def set_lead_status(db: Session, lead_type: str, item_id: int, status: str,
                    note: str | None, user: User, request: Request) -> None:
    """【代码段功能】线索状态流转（BR-7.2 / BR-8.2 / BR-5.2）。
    - 校验目标状态是否在该线索的合法枚举内（技术文档 §7.1 状态机）
    - 更新 status + 处理人 + 处理时间
    - 备注写入 operation_logs.detail（跟进记录，可追溯）"""
    cfg = LEAD_TYPES[lead_type]
    model = cfg["model"]
    if status not in cfg["statuses"]:
        raise BizError(ErrCode.VALIDATION, f"非法的状态值：{status}（可选 {'/'.join(sorted(cfg['statuses']))}）")
    obj = db.get(model, item_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "记录不存在")
    obj.status = status
    obj.processed_by = user.id
    obj.processed_at = datetime.now()
    # 备注与状态变更一并写入操作日志（处理记录，可追溯）
    detail = f"{cfg['label']}#{item_id} 状态→{status}"
    if note:
        detail += f"；备注：{note[:200]}"
    db.add(OperationLog(
        operator_id=user.id, operator_name=user.real_name or user.username,
        action=f"{cfg['perm']}:status", object_type=lead_type, object_id=item_id,
        detail=detail[:1000], ip=request.client.host if request.client else None,
    ))
    db.commit()
