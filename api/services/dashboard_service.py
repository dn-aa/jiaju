# -*- coding: utf-8 -*-
"""【代码段功能】数据看板业务逻辑（阶段 3：BR-9）

- 线索量统计：预约/留言/简历（总数 + 今日/本周/本月），数据直接来自数据库（无埋点）
- 趋势：最近 N 天按日聚合三类线索量（折线图数据源）
- 角色数据维度隔离（PRD §8）：客服→预约+留言；招聘→简历；超管→全部；内容编辑无看板权限
- 北极星指标：有效线索数 = 同一手机号在预约/留言/简历三类中合并去重（PRD §12）
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode
from deps.auth import match_permission
from models.leads import Application, Appointment, Message
from models.org import Role, User

# 线索类型 → (模型, 手机号字段名)（messages 的联系方式字段为 contact，其余为 phone）
LEAD_MODELS: dict[str, tuple] = {
    "appointment": (Appointment, "phone"),
    "message": (Message, "contact"),
    "application": (Application, "phone"),
}


def visible_types(db: Session, user: User) -> list[str]:
    """【代码段功能】按角色返回可见线索类型（BR-9 角色维度）。
    规则：超管("*")全部；含 leads:appointment/leads:message → 客服维度；
    含 leads:application → 招聘维度；都不含（内容编辑）→ 无权限。"""
    role = db.get(Role, user.role_id) if user.role_id else None
    perms = role.permissions if role else []
    if match_permission("*", perms):
        return ["appointment", "message", "application"]
    types = []
    if match_permission("leads:appointment", perms) or match_permission("leads:message", perms):
        types += ["appointment", "message"]
    if match_permission("leads:application", perms):
        types.append("application")
    return types


def lead_stats(db: Session, user: User, days: int = 30) -> dict:
    """【代码段功能】线索量统计：总数/今日/本周/本月 + 趋势 + 北极星指标。
    参数 days：趋势天数（默认 30）。返回按角色可见维度过滤。"""
    types = visible_types(db, user)
    if not types:
        raise BizError(ErrCode.FORBIDDEN, "当前角色无数据看板权限", http_status=403)

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    result: dict = {"types": {}, "trend": [], "effective_leads": 0, "scope": types}
    phones: set[str] = set()   # 北极星指标：跨三类手机号/联系方式去重

    for t in types:
        model, phone_field = LEAD_MODELS[t]
        total = db.query(func.count()).select_from(model).scalar() or 0
        today = db.query(func.count()).select_from(model).filter(model.created_date >= today_start).scalar() or 0
        week = db.query(func.count()).select_from(model).filter(model.created_date >= week_start).scalar() or 0
        month = db.query(func.count()).select_from(model).filter(model.created_date >= month_start).scalar() or 0
        result["types"][t] = {"total": total, "today": today, "week": week, "month": month}
        # 收集联系方式用于去重（留言表字段为 contact）
        for (p,) in db.query(getattr(model, phone_field)).filter(getattr(model, phone_field).isnot(None)).all():
            phones.add(p)

    # 北极星：有效线索数（按手机号合并去重）
    result["effective_leads"] = len(phones)

    # 趋势：最近 days 天按日聚合（无数据日期补 0）
    start = today_start - timedelta(days=days - 1)
    for i in range(days):
        day = start + timedelta(days=i)
        day_end = day + timedelta(days=1)
        row: dict = {"date": day.strftime("%m-%d")}
        for t in types:
            model, _ = LEAD_MODELS[t]
            n = db.query(func.count()).select_from(model).filter(
                model.created_date >= day, model.created_date < day_end).scalar() or 0
            row[t] = n
        result["trend"].append(row)

    return result


def lead_list(db: Session, user: User, lead_type: str, *, status: str | None,
              page: int, page_size: int) -> dict:
    """【代码段功能】看板明细下钻（BR-9.2）：复用线索列表查询，按角色维度校验。"""
    from services import leads_service

    types = visible_types(db, user)
    if not types:
        raise BizError(ErrCode.FORBIDDEN, "当前角色无数据看板权限", http_status=403)
    # 将类型名映射到 leads 路由资源名
    type_map = {"appointment": "appointments", "message": "messages", "application": "applications"}
    res = type_map.get(lead_type)
    if res is None or lead_type not in types:
        raise BizError(ErrCode.FORBIDDEN, "当前角色无权查看该维度明细", http_status=403)
    items, total = leads_service.list_leads(
        db, res, status=status, keyword=None, page=page, page_size=page_size)
    return {
        "list": [leads_service.lead_to_out(res, i) for i in items],
        "pagination": {"total": total, "page": page, "page_size": page_size,
                       "pages": (total + page_size - 1) // page_size},
    }
