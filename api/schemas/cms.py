# -*- coding: utf-8 -*-
"""【代码段功能】内容管理域（CMS）入参/出参 Schema（阶段 2：BR-2~BR-6）

说明：
  - In = 创建/更新入参（字段与数据库设计文档 v2.3 业务字段一致）
  - Out = In + 通用字段（id/is_activate/created_date/updated_date），由 make_out 动态生成，
    保证 OpenAPI 文档可见且避免为 11 个资源手写重复 Out。
"""
from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, create_model

# ---------- 基础 ----------

class CmsBase(BaseModel):
    """所有 CMS 资源 Out 的公共基类：通用字段 + ORM 读取。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_activate: int = 1
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None


def make_out(name: str, schema_in: type[BaseModel]) -> type[BaseModel]:
    """【代码段功能】动态生成 Out Schema：In 字段 + 通用字段。
    参数：name=资源名，schema_in=In Schema（字段继承）。
    返回：可直接用于 response_model 的 Pydantic 模型。"""
    return create_model(
        f"{name}Out",
        __base__=(schema_in, CmsBase),   # 字段 = In 全字段 + 通用字段
    )


# ---------- 空间分类（BR-2.1） ----------

class CategoryIn(BaseModel):
    """产品系列/空间分类：新增与编辑共用。"""
    name: str = Field(min_length=1, max_length=64, description="分类名（客厅/卧室/书房/餐厅/全屋）")
    sort: int = 0


# ---------- 产品（BR-2.2） ----------

class ProductIn(BaseModel):
    """产品：核心业务字段（规格参数 JSON、图集 JSON、发布状态、置顶、排序）。"""
    category_id: int = Field(description="所属空间分类 id")
    series: str = Field(min_length=1, max_length=64, description="所属系列（如：胡桃木）")
    product_code: str = Field(min_length=1, max_length=64, description="产品编号（唯一）")
    name: str = Field(min_length=1, max_length=128, description="产品名")
    description: Optional[str] = Field(None, description="产品描述（富文本，落库前 XSS 清洗）")
    spec_params: Optional[dict] = Field(None, description="规格参数（JSON：材质/尺寸/颜色）")
    cover_image: Optional[str] = None
    gallery: Optional[list] = Field(None, description="其它图片 URL 数组")
    status: Literal["draft", "off", "on"] = "draft"
    is_top: int = 0
    sort: int = 0
    # 关联案例（case_products 多对多；编辑回填/前台展示用，空=None 不修改）
    related_case_ids: Optional[list[int]] = Field(None, description="关联案例 id 列表")


# ---------- 案例（BR-3.1） ----------

class CaseIn(BaseModel):
    """案例：类型/风格/空间/面积/封面/图集/背景/设计说明。"""
    title: str = Field(min_length=1, max_length=128)
    type: Literal["客户实景", "设计方案"]
    style: Optional[str] = None
    space: Optional[str] = None
    area: Optional[str] = None
    cover: Optional[str] = None
    gallery: Optional[list] = None
    background: Optional[str] = Field(None, description="项目背景（富文本）")
    description: Optional[str] = Field(None, description="设计说明（富文本）")
    sort: int = 0
    # 关联产品（case_products 多对多；编辑回填/前台展示用，空=None 不修改）
    related_product_ids: Optional[list[int]] = Field(None, description="关联产品 id 列表")


# ---------- 风格/空间字典（BR-3.2） ----------

class CaseStyleIn(BaseModel):
    """案例风格/空间字典。"""
    name: str = Field(min_length=1, max_length=64)
    type: Literal["style", "space"]
    sort: int = 0


# ---------- 新闻（BR-4.2） ----------

class ArticleIn(BaseModel):
    """新闻文章：分类/封面/摘要/富文本正文/来源/发布状态/置顶/发布窗/作者。"""
    title: str = Field(min_length=1, max_length=128)
    category: Literal["company", "industry"]
    cover_image: Optional[str] = None
    summary: Optional[str] = Field(None, max_length=500)
    body: Optional[str] = Field(None, description="正文（富文本 HTML，落库前 XSS 清洗）")
    source: Optional[str] = Field(None, max_length=128, description="来源（转载标注）")
    is_published: int = Field(0, ge=0, le=1)
    is_top: int = Field(0, ge=0, le=1, description="置顶/推荐")
    publish_at: Optional[datetime] = None
    expire_at: Optional[datetime] = None
    author: Optional[str] = None


# ---------- 职位（BR-5.1） ----------

class JobIn(BaseModel):
    """职位：社招/校招分类、部门、地点、薪资、JD（富文本）。"""
    title: str = Field(min_length=1, max_length=128)
    type: Literal["social", "campus"]
    dept: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    responsibility: Optional[str] = Field(None, description="岗位职责（富文本）")
    requirement: Optional[str] = Field(None, description="任职要求（富文本）")
    sort: int = 0


# ---------- Banner（BR-6.1） ----------

class BannerIn(BaseModel):
    """首页轮播：图片/标题/副标题/链接/生效失效时间 + 轮播多图（阶段 7）。"""
    image: str = Field(min_length=1, max_length=512)
    images: Optional[List[str]] = None      # 轮播多图 URL 列表（首页按序轮播）
    title: Optional[str] = None
    subtitle: Optional[str] = None
    link: Optional[str] = None
    sort: int = 0
    online_at: Optional[datetime] = None
    offline_at: Optional[datetime] = None


# ---------- 页面内容（BR-6.2） ----------

class PageIn(BaseModel):
    """关于TP/发展历程/品牌介绍/联系我们页面内容（key 唯一）。"""
    key: Literal["about", "history", "brand", "contact"]
    title: Optional[str] = None
    content: Optional[str] = Field(None, description="富文本内容（XSS 清洗）")


# ---------- 公告条（FR-7.5） ----------

class AnnouncementIn(BaseModel):
    """顶部公告条文案 + 生效/失效时间。"""
    content: str = Field(min_length=1, max_length=512)
    online_at: Optional[datetime] = None
    offline_at: Optional[datetime] = None
    sort: int = 0


# ---------- 客户评价（FR-1.11） ----------

class ReviewIn(BaseModel):
    """首页客户口碑：头像/姓名/城市/户型/评分/内容。"""
    avatar: Optional[str] = None
    name: str = Field(min_length=1, max_length=64)
    city: Optional[str] = None
    house: Optional[str] = None
    rating: int = Field(5, ge=1, le=5)
    content: Optional[str] = Field(None, max_length=512)
    sort: int = 0


# ---------- 服务流程（FR-1.10） ----------

class ServiceStepIn(BaseModel):
    """首页服务流程四步：序号/标题/说明。"""
    step_no: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=64)
    desc: Optional[str] = Field(None, max_length=512)


# ---------- 状态切换入参（统一端点） ----------

class StatusIn(BaseModel):
    """统一状态切换：status 取值 on/off/draft（由资源配置映射到具体字段）。"""
    status: Literal["on", "off", "draft"]


class SiteConfigIn(BaseModel):
    """联系我们/全局联系信息配置（BR-6.2 / FR-6.4.1，单行 id=1）。"""
    address: Optional[str] = Field(None, max_length=255, description="体验中心地址")
    phone: Optional[str] = Field(None, max_length=64, description="客服电话")
    email: Optional[str] = Field(None, max_length=128, description="联系邮箱")
    hours: Optional[str] = Field(None, max_length=64, description="营业时间（默认 周一至周日 10:00–20:00）")
    map_coord: Optional[str] = Field(None, max_length=64, description="地图坐标")
    appointment_slots: Optional[list] = Field(None, description="预约时段选项（前台预约表单下拉）")


class SortItem(BaseModel):
    """批量排序条目。"""
    id: int
    sort: int


class SortIn(BaseModel):
    """批量排序入参。"""
    items: list[SortItem]


# ---------- 出参注册表 ----------

# 资源名 -> Out Schema（In + 通用字段）
OutSchemas = {
    "categories": make_out("Category", CategoryIn),
    "products": make_out("Product", ProductIn),
    "cases": make_out("Case", CaseIn),
    "case_styles": make_out("CaseStyle", CaseStyleIn),
    "articles": make_out("Article", ArticleIn),
    "jobs": make_out("Job", JobIn),
    "banners": make_out("Banner", BannerIn),
    "pages": make_out("Page", PageIn),
    "announcements": make_out("Announcement", AnnouncementIn),
    "reviews": make_out("Review", ReviewIn),
    "service-steps": make_out("ServiceStep", ServiceStepIn),
}

InSchemas = {
    "categories": CategoryIn,
    "products": ProductIn,
    "cases": CaseIn,
    "case_styles": CaseStyleIn,
    "articles": ArticleIn,
    "jobs": JobIn,
    "banners": BannerIn,
    "pages": PageIn,
    "announcements": AnnouncementIn,
    "reviews": ReviewIn,
    "service-steps": ServiceStepIn,
}
