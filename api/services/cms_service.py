# -*- coding: utf-8 -*-
"""【代码段功能】内容管理域（CMS）通用业务逻辑（阶段 2：BR-2~BR-6）

核心设计：
  - RESOURCES 资源注册表：11 个资源统一声明（模型/状态类型/权限/搜索字段/XSS 字段）
  - 通用 CRUD：list/get/create/update/delete/set_status/set_sorts 一套代码服务全部资源
  - 状态切换映射（开发技术文档 v1.4 §6.5 / 方案 §2.5）：
      activate  → is_activate（on↔1 / off↔0）
      product   → products.status（draft/off/on 原样）
      published → articles.is_published（on↔1 / off↔0）
  - 富文本字段落库前经 bleach 白名单清洗（NFR-2 XSS 防护）
  - 所有写操作记录 operation_logs（BR-10.3 / PRD §10.3）
"""
from fastapi import Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode
from core.xss import sanitize_html
from models.content import (
    Announcement, Article, Banner, Case, CaseProduct, CaseStyle, Category,
    Job, Page, Product, Review, ServiceStep,
)
from models.org import OperationLog, User

# ---------- 资源注册表 ----------
# status_type: activate | product | published
# perm: 权限前缀（view/edit 由路由拼接）
RESOURCES: dict[str, dict] = {
    "categories":      {"model": Category, "status_type": "activate", "perm": "product", "search": ["name"]},
    "products":        {"model": Product, "status_type": "product", "perm": "product",
                        "search": ["name", "product_code", "series"], "xss": ["description"]},
    "cases":           {"model": Case, "status_type": "activate", "perm": "case",
                        "search": ["title", "style"], "xss": ["background", "description"]},
    "case_styles":     {"model": CaseStyle, "status_type": "activate", "perm": "case", "search": ["name"]},
    "articles":        {"model": Article, "status_type": "published", "perm": "article",
                        "search": ["title", "author"], "xss": ["body"]},
    "jobs":            {"model": Job, "status_type": "activate", "perm": "job",
                        "search": ["title", "dept"], "xss": ["responsibility", "requirement"]},
    "banners":         {"model": Banner, "status_type": "activate", "perm": "content", "search": ["title"]},
    "pages":           {"model": Page, "status_type": "activate", "perm": "content", "search": ["key", "title"], "xss": ["content"]},
    "announcements":   {"model": Announcement, "status_type": "activate", "perm": "content", "search": ["content"]},
    "reviews":         {"model": Review, "status_type": "activate", "perm": "content", "search": ["name"]},
    "service-steps":   {"model": ServiceStep, "status_type": "activate", "perm": "content",
                        "search": ["title"], "sort_default": "step_no,asc"},
}


def get_cfg(resource: str) -> dict:
    """【代码段功能】获取资源配置，未知资源返回 404。"""
    cfg = RESOURCES.get(resource)
    if cfg is None:
        raise BizError(ErrCode.NOT_FOUND, "资源类型不存在")
    return cfg


# ---------- 操作日志 ----------

def write_log(db: Session, user: User, request: Request, action: str,
              object_type: str, object_id: int | None, detail: str = "") -> None:
    """【代码段功能】写操作日志（BR-10.3）。
    记录：操作人/动作/对象类型/对象 id/详情/IP，供系统管理-操作日志查询。"""
    db.add(OperationLog(
        operator_id=user.id,
        operator_name=user.real_name or user.username,
        action=action,
        object_type=object_type,
        object_id=object_id,
        detail=detail[:1000],
        ip=request.client.host if request.client else None,
    ))
    db.flush()


# ---------- 列表（搜索/筛选/分页/排序） ----------

def list_items(db: Session, cfg: dict, *, page: int, page_size: int,
               sort: str | None, keyword: str | None) -> tuple[list, int]:
    """【代码段功能】通用列表查询：关键字模糊搜索（OR 拼接 search 字段）+ 分页 + 排序。
    返回 (当前页数据, 总条数)。"""
    q = db.query(cfg["model"])
    if keyword:
        conds = [getattr(cfg["model"], f).like(f"%{keyword}%") for f in cfg.get("search", [])]
        if conds:
            q = q.filter(or_(*conds))
    total = q.count()
    # 排序：sort=field,desc|asc；默认取资源配置 sort_default，否则按 sort 列，无 sort 列回退 id
    field, _, order = (sort or cfg.get("sort_default") or "sort,asc").partition(",")
    col = getattr(cfg["model"], field, None)
    if col is None:
        col = getattr(cfg["model"], "sort", None) or getattr(cfg["model"], "id")
    q = q.order_by(col.desc() if order == "desc" else col.asc())
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ---------- 创建 / 更新（含 XSS 清洗） ----------

def _apply_xss(cfg: dict, data: dict) -> dict:
    """富文本字段 XSS 白名单清洗（bleach），返回清洗后的数据副本。"""
    cleaned = dict(data)
    for f in cfg.get("xss", []):
        if f in cleaned and cleaned[f]:
            cleaned[f] = sanitize_html(str(cleaned[f]))
    return cleaned


def _sync_relations(db: Session, cfg: dict, obj, data: dict) -> None:
    """【代码段功能】同步案例-产品关联（case_products 复合主键表，BR-2/BR-3 关联产品）。
    产品编辑传入 related_case_ids、案例编辑传入 related_product_ids 时重建关联；
    未传该字段（None）则保持现状。"""
    if cfg["model"] is Product and "related_case_ids" in data and data["related_case_ids"] is not None:
        db.query(CaseProduct).filter(CaseProduct.product_id == obj.id).delete()
        for cid in dict.fromkeys(data["related_case_ids"]):   # 去重
            db.add(CaseProduct(case_id=int(cid), product_id=obj.id))
        data.pop("related_case_ids", None)
    elif cfg["model"] is Case and "related_product_ids" in data and data["related_product_ids"] is not None:
        db.query(CaseProduct).filter(CaseProduct.case_id == obj.id).delete()
        for pid in dict.fromkeys(data["related_product_ids"]):
            db.add(CaseProduct(case_id=obj.id, product_id=int(pid)))
        data.pop("related_product_ids", None)


def related_ids(db: Session, cfg: dict, obj) -> dict:
    """【代码段功能】读取关联 id 集合（编辑回填数据源）。
    产品→related_case_ids；案例→related_product_ids；其余资源为空 dict。"""
    if cfg["model"] is Product:
        return {"related_case_ids": [r.case_id for r in
                db.query(CaseProduct).filter(CaseProduct.product_id == obj.id).all()]}
    if cfg["model"] is Case:
        return {"related_product_ids": [r.product_id for r in
                db.query(CaseProduct).filter(CaseProduct.case_id == obj.id).all()]}
    return {}


def create_item(db: Session, cfg: dict, payload: dict, user: User, request: Request):
    """【代码段功能】创建资源：XSS 清洗 → 写入 → 关联维护 → 记录日志。"""
    data = _apply_xss(cfg, payload)
    # 关联字段不写入模型（case_products 单独维护），先剥离备用
    related = _pop_related(data)
    # 通用字段：创建人 = 当前操作人
    obj = cfg["model"](**data, created_at=user.id, updated_at=user.id)
    db.add(obj)
    db.flush()
    _sync_relations(db, cfg, obj, related)
    write_log(db, user, request, f"{cfg['perm']}:create", _obj_name(cfg), obj.id, f"创建 {_label(cfg, obj)}")
    invalidate_home_cache()   # 内容变更 → 首页缓存失效（前台 60s 内可见）
    db.commit()
    db.refresh(obj)
    return obj


def update_item(db: Session, cfg: dict, item_id: int, payload: dict, user: User, request: Request):
    """【代码段功能】更新资源：仅更新传入字段，关联维护，记录日志。"""
    obj = db.get(cfg["model"], item_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "记录不存在")
    data = _apply_xss(cfg, payload)
    related = _pop_related(data)
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = user.id
    _sync_relations(db, cfg, obj, related)
    write_log(db, user, request, f"{cfg['perm']}:update", _obj_name(cfg), obj.id, f"更新 {_label(cfg, obj)}")
    invalidate_home_cache()
    db.commit()
    db.refresh(obj)
    return obj


def _pop_related(data: dict) -> dict:
    """从业务字段中剥离关联 id 字段（related_case_ids/related_product_ids）。"""
    related = {}
    for f in ("related_case_ids", "related_product_ids"):
        if f in data:
            related[f] = data.pop(f)
    return related


def invalidate_home_cache() -> None:
    """首页聚合缓存失效（cms 内容变更后调用，保证前台 60s 内可见更新）。"""
    try:
        from core.limiter import get_redis
        r = get_redis()
        if r is not None:
            r.delete("cache:home")
    except Exception:
        pass


# ---------- 删除（物理删除；产品系列有关联产品禁删） ----------

def delete_item(db: Session, cfg: dict, item_id: int, user: User, request: Request) -> None:
    """【代码段功能】删除资源：物理删除（数据库文档 v2.3 无软删列）。
    特殊：categories（产品系列）存在关联产品时禁止删除（BR-2.1）。"""
    obj = db.get(cfg["model"], item_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "记录不存在")
    if cfg["model"] is Category:
        # 有关联产品禁止删除：任何状态的产品（含禁用）都算关联
        if db.query(Product).filter(Product.category_id == item_id).count() > 0:
            raise BizError(ErrCode.VALIDATION, "该分类下存在产品，禁止删除（可先停用或迁移产品）")
    label = _label(cfg, obj)
    db.delete(obj)
    write_log(db, user, request, f"{cfg['perm']}:delete", _obj_name(cfg), item_id, f"删除 {label}")
    invalidate_home_cache()
    db.commit()


# ---------- 统一状态切换（§2.5 字段映射） ----------

def set_status(db: Session, cfg: dict, item_id: int, status: str, user: User, request: Request) -> str:
    """【代码段功能】统一状态切换端点核心逻辑。
    按 status_type 映射到具体字段：
      activate  → is_activate：on↔1 / off↔0（案例/职位/Banner/公告/评价/步骤/系列）
      product   → products.status：draft/off/on 原样
      published → articles.is_published：on↔1 / off↔0
    返回切换后的状态值（on/off/draft）。"""
    obj = db.get(cfg["model"], item_id)
    if obj is None:
        raise BizError(ErrCode.NOT_FOUND, "记录不存在")
    st = cfg["status_type"]
    if st == "product":
        obj.status = status                       # 产品：支持 draft/off/on 三态
        result = status
    elif st == "published":
        obj.is_published = 1 if status == "on" else 0   # 新闻：发布/下架
        result = "on" if obj.is_published == 1 else "off"
    else:
        obj.is_activate = 1 if status == "on" else 0    # 其余：启用/禁用
        result = "on" if obj.is_activate == 1 else "off"
    obj.updated_at = user.id
    write_log(db, user, request, f"{cfg['perm']}:status_change", _obj_name(cfg), item_id,
              f"{_label(cfg, obj)} 状态→{result}")
    invalidate_home_cache()
    db.commit()
    return result


# ---------- 批量排序 ----------

def set_sorts(db: Session, cfg: dict, items: list[dict], user: User, request: Request) -> None:
    """【代码段功能】批量排序：按 items 中 id→sort 逐条更新。"""
    for it in items:
        obj = db.get(cfg["model"], it["id"])
        if obj is not None:
            obj.sort = int(it["sort"])
            obj.updated_at = user.id
    write_log(db, user, request, f"{cfg['perm']}:sort", _obj_name(cfg), None, "批量排序")
    invalidate_home_cache()
    db.commit()


# ---------- 工具 ----------

def _obj_name(cfg: dict) -> str:
    """对象类型名（日志用）：由模型类名转蛇形。"""
    return cfg["model"].__tablename__


def _label(cfg: dict, obj) -> str:
    """记录展示名（日志详情用）：优先 name/title/key 字段。"""
    for f in ("name", "title", "key"):
        v = getattr(obj, f, None)
        if v:
            return str(v)
    return f"#{getattr(obj, 'id', '')}"
