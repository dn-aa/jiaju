# -*- coding: utf-8 -*-
"""【代码段功能】数据看板路由（阶段 3：BR-9）

GET /api/dashboard/lead-stats?range=30d  线索量统计（总数/今日/本周/本月 + 趋势 + 北极星）
GET /api/dashboard/lead-list?type=...    明细下钻（预约/留言/简历）

说明：看板展示各线索表原始条数（不去重）；北极星"有效线索数"按手机号跨三类去重。
数据范围按角色限定：客服看预约+留言、招聘看简历、超管看全部、内容编辑无权限。
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.response import ok
from db.session import get_db
from deps.auth import require_perm
from services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/lead-stats")
def lead_stats(range: int = 30, db: Session = Depends(get_db),
               user=Depends(require_perm("dashboard:view"))):
    """线索量统计：按角色维度返回可见类型的 total/today/week/month + 30 天趋势 + 有效线索数。"""
    data = dashboard_service.lead_stats(db, user, days=range)
    return ok(data)


@router.get("/lead-list")
def lead_list(type: str, status: str | None = None, page: int = 1, page_size: int = 10,
              db: Session = Depends(get_db), user=Depends(require_perm("dashboard:view"))):
    """看板明细下钻（BR-9.2）：type=appointment|message|application，返回对应线索列表（脱敏）。"""
    data = dashboard_service.lead_list(db, user, type, status=status, page=page, page_size=page_size)
    return ok(data)
