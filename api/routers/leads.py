# -*- coding: utf-8 -*-
"""【代码段功能】线索管理路由（阶段 3：BR-5.2 / BR-7 / BR-8）

GET  /api/leads/{type}            线索列表（状态/关键字筛选 + 分页 + 脱敏）
GET  /api/leads/{type}/{id}       详情（完整信息，处理 Drawer 数据源）
PUT  /api/leads/{type}/{id}/status 状态流转（含备注，operation_logs 留痕）

角色数据维度隔离（PRD §8 / 附录 E）：
  客服    → appointments + messages（leads:appointment / leads:message）
  招聘专员 → applications（leads:application）
  超管    → 全部（"*"）
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode, ok
from db.session import get_db
from deps.auth import require_perm
from schemas.leads import LeadStatusIn
from services import leads_service

router = APIRouter(prefix="/api/leads", tags=["leads"])


def build_lead_routes(lead_type: str) -> None:
    """【代码段功能】为单个线索类型注册路由（默认参数绑定，避免闭包污染）。"""
    cfg = leads_service.LEAD_TYPES[lead_type]
    model = cfg["model"]
    perm = cfg["perm"]

    @router.get(f"/{lead_type}")
    def list_leads(
        status: str | None = None,
        keyword: str | None = None,
        page: int = 1,
        page_size: int = 10,
        db: Session = Depends(get_db),
        user=Depends(require_perm(f"{perm}")),
        _type=lead_type,
    ):
        """线索列表：状态/关键字筛选 + 分页；姓名/手机号脱敏展示。"""
        items, total = leads_service.list_leads(
            db, _type, status=status, keyword=keyword, page=page, page_size=page_size)
        return ok({
            "list": [leads_service.lead_to_out(_type, i) for i in items],
            "pagination": {"total": total, "page": page, "page_size": page_size,
                           "pages": (total + page_size - 1) // page_size},
        })

    @router.get(f"/{lead_type}/{{item_id}}")
    def get_lead(item_id: int, db: Session = Depends(get_db),
                 user=Depends(require_perm(f"{perm}")),
                 _type=lead_type, _model=model):
        """线索详情：完整个人信息（处理 Drawer 数据源，前台不可见；仅授权角色可查）。"""
        obj = db.get(_model, item_id)
        if obj is None:
            raise BizError(ErrCode.NOT_FOUND, "记录不存在")
        return ok(leads_service.lead_to_out(_type, obj, masked=False))

    @router.put(f"/{lead_type}/{{item_id}}/status")
    def change_status(item_id: int, body: LeadStatusIn, request: Request,
                      db: Session = Depends(get_db),
                      user=Depends(require_perm(f"{perm}")),
                      _type=lead_type):
        """状态流转 + 跟进备注（写入操作日志，可追溯）。"""
        leads_service.set_lead_status(db, _type, item_id, body.status, body.note, user, request)
        return ok({"id": item_id, "status": body.status}, message="状态已更新")


for _t in leads_service.LEAD_TYPES:
    build_lead_routes(_t)
