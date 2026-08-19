# -*- coding: utf-8 -*-
"""【代码段功能】前台公开路由（阶段 5）：内容展示 + 线索提交（无登录）

内容展示（只读，均带状态过滤——只返回前台可见内容）：
  GET /api/public/home         首页聚合（Banner/分类/热门产品/案例/新闻/流程/口碑）
  GET /api/public/categories   空间分类
  GET /api/public/products     产品列表（上架 status=on + 启用；分类/关键字）
  GET /api/public/products/{id} 产品详情
  GET /api/public/cases        案例列表（启用；类型/风格筛选）
  GET /api/public/cases/{id}   案例详情
  GET /api/public/articles     新闻列表（已发布；分类/分页）
  GET /api/public/articles/{id} 新闻详情
  GET /api/public/jobs         职位列表（招聘中）
  GET /api/public/jobs/{id}    职位详情
  GET /api/public/pages        页面内容（about/history/brand/contact）
  GET /api/public/site-config  联系信息（页脚/联系我们）
  GET /api/public/announcements 公告条（生效中）

线索提交（BR-5.2/7.1/8.1，验证码校验 + XSS 清洗 + 附件上传）：
  POST /api/public/appointments 在线预约
  POST /api/public/messages     通用留言
  POST /api/public/applications 简历投递（multipart 附件 resume ≤10MB）
"""
from datetime import datetime
import base64
import uuid

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.orm import Session

from core.captcha import gen_captcha_text, render_captcha
from core.config import settings
from core.limiter import captcha_check, captcha_store, client_ip, rate_limit
from core.response import BizError, ErrCode, ok
from core.storage import save_upload
from core.xss import sanitize_html
from db.session import get_db
from models.content import (
    Announcement, Article, Banner, Case, Category, Job, Page, Product, Review, ServiceStep, SiteConfig,
)
from models.leads import Appointment, Application, Message
from schemas.public import AppointmentIn, ApplicationIn, MessageIn

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/health")
def health():
    """健康检查。"""
    return ok({"status": "up"})


@router.get("/captcha")
def captcha(request: Request):
    """图形验证码：返回 captcha_id + base64 PNG（答案存 Redis 60s，FR-7.2）。"""
    if not settings.captcha_enabled:
        return ok({"captcha_id": "disabled", "image": None})
    text = gen_captcha_text()
    captcha_id = uuid.uuid4().hex
    captcha_store(captcha_id, text)
    img = render_captcha(text)
    return ok({
        "captcha_id": captcha_id,
        "image": "data:image/png;base64," + base64.b64encode(img).decode(),
    })


# ============================================================
# 【代码段功能】验证码校验（FR-7.2）
# ============================================================
def verify_captcha(captcha_id: str, code: str) -> None:
    """校验验证码：启用时校验并一次性消费（Redis 60s TTL）；禁用时跳过。"""
    if not settings.captcha_enabled:
        return
    if not captcha_check(captcha_id, code):
        raise BizError(ErrCode.VALIDATION, "验证码错误或已过期")


# ============================================================
# 【代码段功能】首页聚合（BR-1.x 各区块数据源）
# ============================================================
@router.get("/home")
def home(db: Session = Depends(get_db)):
    now = datetime.now()
    banners = [{"id": b.id, "image": b.image, "title": b.title, "subtitle": b.subtitle, "link": b.link}
               for b in db.query(Banner).filter(Banner.is_activate == 1).order_by(Banner.sort.asc()).all()
               if (b.online_at is None or b.online_at <= now) and (b.offline_at is None or b.offline_at >= now)]
    categories = [{"id": c.id, "name": c.name} for c in
                  db.query(Category).filter(Category.is_activate == 1).order_by(Category.sort.asc()).all()]
    hot_products = [{"id": p.id, "name": p.name, "cover_image": p.cover_image, "series": p.series,
                     "product_code": p.product_code, "is_top": p.is_top}
                    for p in db.query(Product).filter(Product.is_activate == 1, Product.status == "on")
                    .order_by(Product.is_top.desc(), Product.sort.asc()).limit(6).all()]
    new_cases = [{"id": c.id, "title": c.title, "type": c.type, "style": c.style, "space": c.space,
                  "cover": c.cover} for c in db.query(Case).filter(Case.is_activate == 1)
                 .order_by(Case.id.desc()).limit(3).all()]
    news = [{"id": a.id, "title": a.title, "category": a.category, "summary": a.summary,
             "cover_image": a.cover_image, "publish_at": a.publish_at}
            for a in db.query(Article).filter(Article.is_activate == 1, Article.is_published == 1)
            .order_by(Article.publish_at.desc()).limit(3).all()]
    steps = [{"step_no": s.step_no, "title": s.title, "desc": s.desc}
             for s in db.query(ServiceStep).filter(ServiceStep.is_activate == 1)
             .order_by(ServiceStep.step_no.asc()).all()]
    reviews = [{"id": r.id, "avatar": r.avatar, "name": r.name, "city": r.city, "house": r.house,
                "rating": r.rating, "content": r.content}
               for r in db.query(Review).filter(Review.is_activate == 1).order_by(Review.sort.asc()).limit(4).all()]
    announcement = db.query(Announcement).filter(Announcement.is_activate == 1,
                                                 (Announcement.online_at.is_(None)) | (Announcement.online_at <= now),
                                                 (Announcement.offline_at.is_(None)) | (Announcement.offline_at >= now)) \
        .order_by(Announcement.sort.asc()).first()
    return ok({
        "banners": banners, "categories": categories, "hot_products": hot_products,
        "new_cases": new_cases, "news": news, "steps": steps, "reviews": reviews,
        "announcement": announcement.content if announcement else None,
    })


# ============================================================
# 【代码段功能】内容列表/详情（只返回前台可见内容）
# ============================================================

@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    """空间分类（启用中）。"""
    return ok([{"id": c.id, "name": c.name} for c in
               db.query(Category).filter(Category.is_activate == 1).order_by(Category.sort.asc()).all()])


@router.get("/products")
def products(category_id: int | None = None, keyword: str | None = None,
             page: int = 1, page_size: int = 9, db: Session = Depends(get_db)):
    """产品列表：仅上架（status=on）且启用；按分类/关键字过滤，置顶优先。"""
    q = db.query(Product).filter(Product.is_activate == 1, Product.status == "on")
    if category_id:
        q = q.filter(Product.category_id == category_id)
    if keyword:
        q = q.filter((Product.name.like(f"%{keyword}%")) | (Product.series.like(f"%{keyword}%")))
    total = q.count()
    items = q.order_by(Product.is_top.desc(), Product.sort.asc()) \
        .offset((page - 1) * page_size).limit(page_size).all()
    return ok({"list": [{
        "id": p.id, "name": p.name, "series": p.series, "product_code": p.product_code,
        "cover_image": p.cover_image, "category_id": p.category_id, "is_top": p.is_top,
    } for p in items], "pagination": {"total": total, "page": page, "page_size": page_size}})


@router.get("/products/{item_id}")
def product_detail(item_id: int, db: Session = Depends(get_db)):
    """产品详情：含规格参数/图集/富文本描述。"""
    p = db.get(Product, item_id)
    if p is None or p.is_activate != 1 or p.status != "on":
        raise BizError(ErrCode.NOT_FOUND, "产品不存在或已下架")
    return ok({"id": p.id, "name": p.name, "series": p.series, "product_code": p.product_code,
               "description": p.description, "spec_params": p.spec_params or {},
               "cover_image": p.cover_image, "gallery": p.gallery or [],
               "category_id": p.category_id, "is_top": p.is_top})


@router.get("/cases")
def cases(type: str | None = None, page: int = 1, page_size: int = 6, db: Session = Depends(get_db)):
    """案例列表：启用中；类型/分页。"""
    q = db.query(Case).filter(Case.is_activate == 1)
    if type:
        q = q.filter(Case.type == type)
    total = q.count()
    items = q.order_by(Case.sort.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return ok({"list": [{
        "id": c.id, "title": c.title, "type": c.type, "style": c.style, "space": c.space,
        "area": c.area, "cover": c.cover,
    } for c in items], "pagination": {"total": total, "page": page, "page_size": page_size}})


@router.get("/cases/{item_id}")
def case_detail(item_id: int, db: Session = Depends(get_db)):
    """案例详情：图集/项目背景/设计说明。"""
    c = db.get(Case, item_id)
    if c is None or c.is_activate != 1:
        raise BizError(ErrCode.NOT_FOUND, "案例不存在")
    return ok({"id": c.id, "title": c.title, "type": c.type, "style": c.style, "space": c.space,
               "area": c.area, "cover": c.cover, "gallery": c.gallery or [],
               "background": c.background, "description": c.description})


@router.get("/articles")
def articles(category: str | None = None, page: int = 1, page_size: int = 6, db: Session = Depends(get_db)):
    """新闻列表：仅已发布（is_published=1）且启用。"""
    q = db.query(Article).filter(Article.is_activate == 1, Article.is_published == 1)
    if category:
        q = q.filter(Article.category == category)
    total = q.count()
    items = q.order_by(Article.publish_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return ok({"list": [{
        "id": a.id, "title": a.title, "category": a.category, "summary": a.summary,
        "cover_image": a.cover_image, "source": a.source, "author": a.author, "publish_at": a.publish_at,
    } for a in items], "pagination": {"total": total, "page": page, "page_size": page_size}})


@router.get("/articles/{item_id}")
def article_detail(item_id: int, db: Session = Depends(get_db)):
    """新闻详情：富文本正文。"""
    a = db.get(Article, item_id)
    if a is None or a.is_activate != 1 or a.is_published != 1:
        raise BizError(ErrCode.NOT_FOUND, "文章不存在")
    return ok({"id": a.id, "title": a.title, "category": a.category, "summary": a.summary,
               "body": a.body, "source": a.source, "author": a.author, "publish_at": a.publish_at})


@router.get("/jobs")
def jobs(type: str | None = None, page: int = 1, page_size: int = 10, db: Session = Depends(get_db)):
    """职位列表：招聘中（is_activate=1）；社招/校招筛选。"""
    q = db.query(Job).filter(Job.is_activate == 1)
    if type:
        q = q.filter(Job.type == type)
    total = q.count()
    items = q.order_by(Job.sort.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return ok({"list": [{
        "id": j.id, "title": j.title, "type": j.type, "dept": j.dept, "location": j.location,
        "salary": j.salary,
    } for j in items], "pagination": {"total": total, "page": page, "page_size": page_size}})


@router.get("/jobs/{item_id}")
def job_detail(item_id: int, db: Session = Depends(get_db)):
    """职位详情：JD（岗位职责/任职要求）。"""
    j = db.get(Job, item_id)
    if j is None or j.is_activate != 1:
        raise BizError(ErrCode.NOT_FOUND, "职位不存在")
    return ok({"id": j.id, "title": j.title, "type": j.type, "dept": j.dept, "location": j.location,
               "salary": j.salary, "responsibility": j.responsibility, "requirement": j.requirement})


@router.get("/pages")
def pages(db: Session = Depends(get_db)):
    """页面内容（关于TP/发展历程/品牌介绍，启用中）。"""
    return ok([{"key": p.key, "title": p.title, "content": p.content}
               for p in db.query(Page).filter(Page.is_activate == 1).all()])


@router.get("/site-config")
def site_config(db: Session = Depends(get_db)):
    """联系信息（页脚/联系我们/预约时段同源）。"""
    cfg = db.get(SiteConfig, 1)
    if cfg is None:
        return ok({})
    return ok({"address": cfg.address, "phone": cfg.phone, "email": cfg.email,
               "hours": cfg.hours, "map_coord": cfg.map_coord,
               "appointment_slots": cfg.appointment_slots or []})


@router.get("/announcements")
def announcements(db: Session = Depends(get_db)):
    """顶部公告条（生效时间范围内且启用）。"""
    now = datetime.now()
    item = db.query(Announcement).filter(Announcement.is_activate == 1,
                                         (Announcement.online_at.is_(None)) | (Announcement.online_at <= now),
                                         (Announcement.offline_at.is_(None)) | (Announcement.offline_at >= now)) \
        .order_by(Announcement.sort.asc()).first()
    return ok({"content": item.content if item else None})


# ============================================================
# 【代码段功能】线索提交（BR-5.2/7.1/8.1，防刷限流 + 验证码 + XSS）
# ============================================================

@router.post("/appointments")
def submit_appointment(body: AppointmentIn, request: Request, db: Session = Depends(get_db)):
    """在线预约提交：验证码校验 → 写入 appointments（待处理）。"""
    rate_limit(f"appointment:{client_ip(request)}", limit=10, window=3600)
    verify_captcha(body.captcha_id, body.captcha_code)
    db.add(Appointment(name=body.name.strip(), phone=body.phone.strip(),
                       appointment_date=body.appointment_date, slot=body.slot,
                       note=sanitize_html(body.note) if body.note else None))
    db.commit()
    return ok(message="预约提交成功，客服将尽快与您联系")


@router.post("/messages")
def submit_message(body: MessageIn, request: Request, db: Session = Depends(get_db)):
    """通用留言提交：验证码校验 → 内容 XSS 清洗 → 写入 messages（未读）。"""
    rate_limit(f"message:{client_ip(request)}", limit=10, window=3600)
    verify_captcha(body.captcha_id, body.captcha_code)
    db.add(Message(name=body.name.strip(), contact=body.contact.strip(),
                   content=sanitize_html(body.content)[:500]))
    db.commit()
    return ok(message="留言提交成功，感谢您的咨询")


@router.post("/applications")
async def submit_application(
    request: Request,
    job_id: int = Form(...), name: str = Form(...), phone: str = Form(...),
    email: str | None = Form(None), intro: str | None = Form(None),
    school: str | None = Form(None), education: str | None = Form(None),
    major: str | None = Form(None), grad_at: str | None = Form(None),
    work_years: int | None = Form(None), current_title: str | None = Form(None),
    captcha_id: str = Form(...), captcha_code: str = Form(...),
    attachment: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """简历投递提交：验证码 → 附件上传（resume ≤10MB）→ 写入 applications（待处理）。"""
    rate_limit(f"application:{client_ip(request)}", limit=5, window=3600)
    verify_captcha(captcha_id, captcha_code)
    if db.get(Job, job_id) is None:
        raise BizError(ErrCode.VALIDATION, "应聘职位不存在")
    attachment_url = None
    if attachment and attachment.filename:
        attachment_url = await save_upload(attachment, "resume")
    db.add(Application(job_id=job_id, name=name.strip(), phone=phone.strip(),
                       email=email, intro=sanitize_html(intro) if intro else None,
                       attachment=attachment_url, school=school, education=education,
                       major=major, grad_at=grad_at, work_years=work_years,
                       current_title=current_title))
    db.commit()
    return ok(message="投递成功，祝您求职顺利")
