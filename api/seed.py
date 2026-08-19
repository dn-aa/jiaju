"""种子数据脚本（幂等，可重复执行）：对齐数据库设计文档 v2.3 §7.2。
用法：cd api && python seed.py
默认开发密码 admin123；生产部署请通过环境变量 SEED_ADMIN_PASSWORD 注入强密码。"""
import os

from core.security import hash_password
from db.session import SessionLocal
from models.org import Department, Role, User
from models.content import Category, CaseStyle, ServiceStep, SiteConfig

# 角色权限编码（开发技术文档 v1.4 附录 E，正式值）
ROLES = {
    "超级管理员": ["*"],
    "内容编辑": [
        "product:view", "product:edit",
        "case:view", "case:edit",
        "article:view", "article:edit",
        "job:view", "job:edit",
        "content:view", "content:edit",
    ],
    "客服": ["leads:appointment", "leads:message", "dashboard:view"],
    "招聘专员": ["job:view", "job:edit", "leads:application", "dashboard:view"],
}

# 初始账号：username -> (real_name, nickname, phone, email, role_name, dept_name)
USERS = {
    "admin": ("系统管理员", "管理员", "13800000000", "admin@tp-home.com", "超级管理员", "总部"),
    "editor01": ("内容编辑一号", "编辑小墨", "13800000001", "editor01@tp-home.com", "内容编辑", "设计中心"),
    "cs01": ("客服一号", "客服小金", "13800000002", "cs01@tp-home.com", "客服", "客户中心"),
    "hr01": ("招聘专员一号", "招聘小金", "13800000003", "hr01@tp-home.com", "招聘专员", "人力部"),
}

DEPARTMENTS = [("总部", 0), ("设计中心", 0), ("运营中心", 0), ("客户中心", 0), ("人力部", 0), ("软装中心", 2), ("品牌中心", 3)]

CATEGORIES = ["客厅", "卧室", "书房", "餐厅", "全屋"]

STEPS = [
    (1, "预约咨询", "留下到店意向，专属顾问 1 对 1 沟通"),
    (2, "上门量房", "设计师实地勘测，采集真实空间数据"),
    (3, "方案设计", "一体化设计呈现，材质与软装统一规划"),
    (4, "一体化交付", "工厂定制到上门安装，闭环交付与售后跟进"),
]

CASE_STYLES = [
    ("现代", "style", 1), ("轻奢", "style", 2), ("新中式", "style", 3), ("侘寂", "style", 4), ("北欧", "style", 5),
    ("客厅", "space", 1), ("卧室", "space", 2), ("书房", "space", 3), ("餐厅", "space", 4), ("全屋", "space", 5),
]

SITE_CONFIG = dict(
    address="上海市徐汇区××路 ×× 号 TP 体验中心",
    phone="400-XXX-XXXX",
    email="contact@tp-home.com",
    hours="周一至周日 10:00–20:00",
    appointment_slots=["上午（09:00–12:00）", "下午（13:00–18:00）", "晚间（18:00–20:00）"],
)

DEFAULT_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "admin123")


def seed() -> None:
    db = SessionLocal()
    try:
        # 部门
        dept_ids: dict[str, int] = {}
        if db.query(Department).count() == 0:
            for name, parent in DEPARTMENTS:
                d = Department(name=name, parent_id=dept_ids.get(str(parent), parent))
                db.add(d)
                db.flush()
                dept_ids[name] = d.id
            print(f"[seed] 部门 x{len(DEPARTMENTS)}")

        # 角色
        role_ids: dict[str, int] = {}
        if db.query(Role).count() == 0:
            for name, perms in ROLES.items():
                r = Role(name=name, permissions=perms)
                db.add(r)
                db.flush()
                role_ids[name] = r.id
            print(f"[seed] 角色 x{len(ROLES)}")

        # 用户（默认密码 admin123，开发环境）
        if db.query(User).count() == 0:
            pw = hash_password(DEFAULT_PASSWORD)
            for username, (real, nick, phone, email, role_name, dept_name) in USERS.items():
                dept = db.query(Department).filter(Department.name == dept_name).first()
                role = db.query(Role).filter(Role.name == role_name).first()
                db.add(User(
                    username=username, password_hash=pw, real_name=real, nickname=nick,
                    phone=phone, email=email, dept_id=dept.id if dept else None, role_id=role.id,
                ))
            print(f"[seed] 用户 x{len(USERS)}（默认密码 {DEFAULT_PASSWORD}）")

        # 空间分类
        if db.query(Category).count() == 0:
            for i, name in enumerate(CATEGORIES, start=1):
                db.add(Category(name=name, sort=i))
            print(f"[seed] 空间分类 x{len(CATEGORIES)}")

        # 站点配置（单行 id=1）
        if db.query(SiteConfig).count() == 0:
            db.add(SiteConfig(**SITE_CONFIG))
            print("[seed] site_config 单行")

        # 服务流程
        if db.query(ServiceStep).count() == 0:
            for no, title, desc in STEPS:
                db.add(ServiceStep(step_no=no, title=title, desc=desc))
            print(f"[seed] 服务流程 x{len(STEPS)}")

        # 风格/空间字典
        if db.query(CaseStyle).count() == 0:
            for name, t, sort in CASE_STYLES:
                db.add(CaseStyle(name=name, type=t, sort=sort))
            print(f"[seed] 风格/空间字典 x{len(CASE_STYLES)}")

        db.commit()
        print("[seed] 完成 ✅")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
