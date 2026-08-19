# -*- coding: utf-8 -*-
"""【代码段功能】内容管理域（CMS）路由工厂（阶段 2：BR-2~BR-6）

为 11 个资源（categories/products/cases/case_styles/articles/jobs/banners/
pages/announcements/reviews/service-steps）统一生成 REST 路由：
  GET    /api/cms/{resource}           列表（搜索/分页/排序，perm:view）
  GET    /api/cms/{resource}/{id}      详情
  POST   /api/cms/{resource}           创建（perm:edit）
  PUT    /api/cms/{resource}/{id}      更新（编辑回填数据源）
  DELETE /api/cms/{resource}/{id}      删除（敏感操作，二次确认在前端）
  PUT    /api/cms/{resource}/{id}/status  统一状态切换（§2.5 字段映射）
  POST   /api/cms/{resource}/sort      批量排序

权限编码（开发技术文档 v1.4 附录 E）：product/case/article/job/content 的 view/edit。

⚠️ 实现注意：循环内注册路由必须用「默认参数绑定」捕获资源配置，
   否则 Python 闭包延迟绑定会导致所有路由引用最后一个资源的配置。
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode, ok
from db.session import get_db
from deps.auth import require_perm
from schemas.cms import InSchemas, OutSchemas, SortIn, StatusIn
from services import cms_service

router = APIRouter(prefix="/api/cms", tags=["cms"])


def build_resource_routes(resource: str) -> None:
    """【代码段功能】为单个资源注册全部路由。
    所有闭包引用（cfg/model/schema/perm）均通过默认参数在定义时绑定，避免循环变量污染。"""
    cfg = cms_service.get_cfg(resource)
    model = cfg["model"]
    schema_in = InSchemas[resource]
    schema_out = OutSchemas[resource]
    perm = cfg["perm"]

    @router.get(f"/{resource}")
    def list_items(
        request: Request,
        page: int = 1,
        page_size: int = 12,
        sort: str | None = None,
        keyword: str | None = None,
        db: Session = Depends(get_db),
        user=Depends(require_perm(f"{perm}:view")),
        # —— 以下默认参数在定义时绑定当前资源配置 ——
        _cfg=cfg, _schema_out=schema_out,
    ):
        """资源列表：keyword 模糊搜索 + 分页 + 排序（返回 list + pagination）。"""
        items, total = cms_service.list_items(
            db, _cfg, page=page, page_size=page_size, sort=sort, keyword=keyword)
        return ok({
            "list": [_schema_out.model_validate(i).model_dump() for i in items],
            "pagination": {
                "total": total, "page": page, "page_size": page_size,
                "pages": (total + page_size - 1) // page_size,
            },
        })

    @router.get(f"/{resource}/{{item_id}}")
    def get_item(item_id: int, db: Session = Depends(get_db),
                 user=Depends(require_perm(f"{perm}:view")),
                 _model=model, _schema_out=schema_out):
        """资源详情（编辑表单回填数据源）。"""
        obj = db.get(_model, item_id)
        if obj is None:
            raise BizError(ErrCode.NOT_FOUND, "记录不存在")
        return ok(_schema_out.model_validate(obj).model_dump())

    @router.post(f"/{resource}")
    def create_item(
        payload: schema_in, request: Request, db: Session = Depends(get_db),
        user=Depends(require_perm(f"{perm}:edit")),
        _cfg=cfg, _schema_out=schema_out,
    ):
        """创建资源：新增后即时上列表（PRD §7 通用约定）。"""
        obj = cms_service.create_item(db, _cfg, payload.model_dump(), user, request)
        return ok(_schema_out.model_validate(obj).model_dump())

    @router.put(f"/{resource}/{{item_id}}")
    def update_item(
        item_id: int, payload: schema_in, request: Request, db: Session = Depends(get_db),
        user=Depends(require_perm(f"{perm}:edit")),
        _cfg=cfg, _schema_out=schema_out,
    ):
        """更新资源：编辑表单保存（前端带数据回填）。"""
        obj = cms_service.update_item(db, _cfg, item_id, payload.model_dump(), user, request)
        return ok(_schema_out.model_validate(obj).model_dump())

    @router.delete(f"/{resource}/{{item_id}}")
    def delete_item(item_id: int, request: Request, db: Session = Depends(get_db),
                    user=Depends(require_perm(f"{perm}:edit")),
                    _cfg=cfg):
        """删除资源：物理删除（产品系列有关联产品时后端拦截）。"""
        cms_service.delete_item(db, _cfg, item_id, user, request)
        return ok(message="删除成功")

    @router.put(f"/{resource}/{{item_id}}/status")
    def change_status(item_id: int, body: StatusIn, request: Request,
                      db: Session = Depends(get_db),
                      user=Depends(require_perm(f"{perm}:edit")),
                      _cfg=cfg):
        """统一状态切换：行内 Tag 点击调用，即时生效（§2.5 字段映射）。"""
        new_status = cms_service.set_status(db, _cfg, item_id, body.status, user, request)
        return ok({"id": item_id, "status": new_status}, message="状态已更新")

    @router.post(f"/{resource}/sort")
    def sort_items(body: SortIn, request: Request, db: Session = Depends(get_db),
                   user=Depends(require_perm(f"{perm}:edit")),
                   _cfg=cfg):
        """批量排序：传入 [{id, sort}]。"""
        cms_service.set_sorts(db, _cfg, [i.model_dump() for i in body.items], user, request)
        return ok(message="排序已保存")


# 启动时注册全部资源路由（每个资源的配置在各自调用中绑定）
for _res in cms_service.RESOURCES:
    build_resource_routes(_res)


# ============================================================
# 【代码段功能】站点配置（site_config，单行 id=1）管理端点（BR-6.2 联系我们）
#   与前台「联系我们」页、全局页脚联系信息条同源（FR-6.4.1）
# ============================================================
from models.content import SiteConfig  # noqa: E402
from schemas.cms import SiteConfigIn  # noqa: E402


@router.get("/site-config")
def get_site_config(db: Session = Depends(get_db),
                    user=Depends(require_perm("content:view"))):
    """读取联系信息配置（单行，固定 id=1；不存在时返回空默认值）。"""
    cfg = db.get(SiteConfig, 1)
    if cfg is None:
        return ok({})
    return ok({
        "address": cfg.address, "phone": cfg.phone, "email": cfg.email,
        "hours": cfg.hours, "map_coord": cfg.map_coord,
        "appointment_slots": cfg.appointment_slots or [],
    })


@router.put("/site-config")
def update_site_config(payload: SiteConfigIn, request: Request, db: Session = Depends(get_db),
                       user=Depends(require_perm("content:edit"))):
    """更新联系信息配置（仅允许更新 id=1 行，单行约束由应用层保证）。"""
    cfg = db.get(SiteConfig, 1)
    data = payload.model_dump(exclude_none=True)
    if cfg is None:
        cfg = SiteConfig(id=1, **data)
        db.add(cfg)
    else:
        for k, v in data.items():
            setattr(cfg, k, v)
    db.flush()
    cms_service.write_log(db, user, request, "content:update", "site_config", 1, "更新联系信息配置")
    db.commit()
    return ok({"address": cfg.address, "phone": cfg.phone, "email": cfg.email,
               "hours": cfg.hours, "map_coord": cfg.map_coord,
               "appointment_slots": cfg.appointment_slots or []})
