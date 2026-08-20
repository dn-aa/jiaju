"""内容域 Models：categories / products / cases / case_products / case_styles / articles / jobs /
banners / pages / site_config / announcements / reviews / service_steps。
对齐数据库设计文档 v2.3：逻辑外键 + 索引策略（无物理 FK）。"""
from datetime import date, datetime

from sqlalchemy import (
    BigInteger, CheckConstraint, Date, DateTime, Index, Integer, String, Text, func,
)
from sqlalchemy.dialects.mysql import JSON, LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column

from db.base import TimestampMixin, Base


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (Index("idx_sort", "sort"),)

    name: Mapped[str] = mapped_column(String(64), comment="空间分类名（客厅/卧室/书房/餐厅/全屋）")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("uk_product_code", "product_code", unique=True),
        Index("idx_category", "category_id"),
        Index("idx_series", "series"),
        Index("idx_status", "status"),
        Index("idx_sort", "sort"),
    )

    category_id: Mapped[int] = mapped_column(BigInteger, comment="所属空间分类（逻辑 FK→categories.id）")
    series: Mapped[str] = mapped_column(String(64), comment="所属系列（如：胡桃木）")
    product_code: Mapped[str] = mapped_column(String(64), comment="产品编号")
    name: Mapped[str] = mapped_column(String(128), comment="产品名")
    description: Mapped[str | None] = mapped_column(LONGTEXT, comment="产品描述（富文本）")
    spec_params: Mapped[dict | None] = mapped_column(JSON, comment="规格参数（JSON 串）")
    cover_image: Mapped[str | None] = mapped_column(String(512), comment="封面图片 URL")
    gallery: Mapped[list | None] = mapped_column(JSON, comment="其它图片 URL（JSON 串）")
    status: Mapped[str] = mapped_column(String(20), default="draft", server_default="draft",
                                        comment="发布状态：on 上架 / off 下架 / draft 草稿")
    is_top: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="是否置顶 0/1")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")


class Case(TimestampMixin, Base):
    __tablename__ = "cases"
    __table_args__ = (Index("idx_type", "type"),)

    title: Mapped[str] = mapped_column(String(128), comment="标题")
    type: Mapped[str] = mapped_column(String(20), comment="客户实景/设计方案")
    style: Mapped[str | None] = mapped_column(String(32), comment="风格")
    space: Mapped[str | None] = mapped_column(String(32), comment="空间")
    area: Mapped[str | None] = mapped_column(String(32), comment="面积")
    cover: Mapped[str | None] = mapped_column(String(512), comment="封面")
    gallery: Mapped[list | None] = mapped_column(JSON, comment="图集")
    background: Mapped[str | None] = mapped_column(LONGTEXT, comment="项目背景")
    description: Mapped[str | None] = mapped_column(LONGTEXT, comment="设计说明")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")


class CaseProduct(Base):
    """案例-产品关联（复合主键表，无独立 id；对齐数据库设计文档 v2.3 §4）。"""
    __tablename__ = "case_products"
    __table_args__ = (Index("idx_product", "product_id"),)

    case_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, comment="案例 id（逻辑 FK→cases.id）")
    product_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, comment="产品 id（逻辑 FK→products.id）")

    is_activate: Mapped[int] = mapped_column(default=1, server_default="1", comment="1激活/0禁用")
    created_at: Mapped[int | None] = mapped_column(BigInteger, comment="创建人(用户id)")
    created_date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at: Mapped[int | None] = mapped_column(BigInteger, comment="修改人(用户id)")
    updated_date: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="修改时间"
    )


class CaseStyle(TimestampMixin, Base):
    __tablename__ = "case_styles"
    __table_args__ = (Index("idx_type", "type"),)

    name: Mapped[str] = mapped_column(String(64), comment="字典值")
    type: Mapped[str] = mapped_column(String(20), comment="style|space")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")


class Article(TimestampMixin, Base):
    __tablename__ = "articles"
    __table_args__ = (
        Index("idx_category", "category"),
        Index("idx_publish", "publish_at"),
        Index("idx_published", "is_published"),
    )

    title: Mapped[str] = mapped_column(String(128), comment="标题")
    category: Mapped[str] = mapped_column(String(20), comment="分类：company 企业新闻 / industry 行业资讯")
    cover_image: Mapped[str | None] = mapped_column(String(512), comment="封面图 URL")
    summary: Mapped[str | None] = mapped_column(String(500), comment="摘要")
    body: Mapped[str | None] = mapped_column(LONGTEXT, comment="正文（富文本 HTML）")
    source: Mapped[str | None] = mapped_column(String(128), comment="来源（转载标注）")
    is_published: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="是否发布 0/1")
    is_top: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="是否置顶/推荐 0/1")
    publish_at: Mapped[datetime | None] = mapped_column(DateTime, comment="发布时间")
    expire_at: Mapped[datetime | None] = mapped_column(DateTime, comment="截止时间")
    author: Mapped[str | None] = mapped_column(String(64), comment="作者")


class Job(TimestampMixin, Base):
    __tablename__ = "jobs"
    __table_args__ = (Index("idx_type", "type"),)

    title: Mapped[str] = mapped_column(String(128), comment="职位名")
    type: Mapped[str] = mapped_column(String(20), comment="social 社会招聘 / campus 校园招聘")
    dept: Mapped[str | None] = mapped_column(String(64), comment="部门")
    location: Mapped[str | None] = mapped_column(String(64), comment="地点")
    salary: Mapped[str | None] = mapped_column(String(64), comment="薪资范围")
    cover_image: Mapped[str | None] = mapped_column(String(512), comment="配图 URL（前台加入我们卡片展示）")
    responsibility: Mapped[str | None] = mapped_column(LONGTEXT, comment="岗位职责")
    requirement: Mapped[str | None] = mapped_column(LONGTEXT, comment="任职要求")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")


class Banner(TimestampMixin, Base):
    __tablename__ = "banners"
    __table_args__ = (Index("idx_sort", "sort"),)

    image: Mapped[str] = mapped_column(String(512), comment="图片 URL")
    title: Mapped[str | None] = mapped_column(String(128), comment="标题")
    subtitle: Mapped[str | None] = mapped_column(String(255), comment="副标题")
    link: Mapped[str | None] = mapped_column(String(512), comment="跳转链接")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")
    online_at: Mapped[datetime | None] = mapped_column(DateTime, comment="生效时间")
    offline_at: Mapped[datetime | None] = mapped_column(DateTime, comment="失效时间")


class Page(TimestampMixin, Base):
    __tablename__ = "pages"
    __table_args__ = (Index("uk_key", "key", unique=True),)

    key: Mapped[str] = mapped_column(String(32), comment="about|history|brand|contact")
    title: Mapped[str | None] = mapped_column(String(128), comment="页面标题")
    content: Mapped[str | None] = mapped_column(LONGTEXT, comment="富文本内容")


class SiteConfig(TimestampMixin, Base):
    # 单行约束（id 固定 1）由应用层保证：种子只插 id=1，写接口仅允许更新 id=1 行
    # （MySQL 8.0 不允许 CHECK 引用 AUTO_INCREMENT 列，故不用 chk_single 约束）
    __tablename__ = "site_config"

    address: Mapped[str | None] = mapped_column(String(255), comment="体验中心地址")
    phone: Mapped[str | None] = mapped_column(String(64), comment="客服电话")
    email: Mapped[str | None] = mapped_column(String(128), comment="联系邮箱")
    hours: Mapped[str | None] = mapped_column(String(64), comment="营业时间")
    map_coord: Mapped[str | None] = mapped_column(String(64), comment="地图坐标")
    appointment_slots: Mapped[list | None] = mapped_column(JSON, comment="预约时段选项")


class Announcement(TimestampMixin, Base):
    __tablename__ = "announcements"

    content: Mapped[str] = mapped_column(String(512), comment="公告文案")
    online_at: Mapped[datetime | None] = mapped_column(DateTime, comment="生效时间")
    offline_at: Mapped[datetime | None] = mapped_column(DateTime, comment="失效时间")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")


class Review(TimestampMixin, Base):
    __tablename__ = "reviews"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="chk_rating"),)

    avatar: Mapped[str | None] = mapped_column(String(512), comment="头像 URL")
    name: Mapped[str] = mapped_column(String(64), comment="客户姓名")
    city: Mapped[str | None] = mapped_column(String(64), comment="城市")
    house: Mapped[str | None] = mapped_column(String(64), comment="户型")
    rating: Mapped[int] = mapped_column(Integer, default=5, server_default="5", comment="评分 1-5")
    content: Mapped[str | None] = mapped_column(String(512), comment="评价内容")
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default="0", comment="排序值")


class ServiceStep(TimestampMixin, Base):
    __tablename__ = "service_steps"

    step_no: Mapped[int] = mapped_column(Integer, comment="步骤序号 1-4")
    title: Mapped[str] = mapped_column(String(64), comment="步骤标题")
    desc: Mapped[str | None] = mapped_column(String(512), comment="步骤说明")
