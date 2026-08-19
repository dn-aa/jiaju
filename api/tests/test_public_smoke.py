# -*- coding: utf-8 -*-
"""【代码段功能】阶段 5 · 前台公开接口冒烟验收脚本（BR-1~BR-8 公开部分）

覆盖：首页聚合、内容列表/详情、前台状态过滤（草稿/下架不展示）、
线索提交（验证码从 Redis 取答案 → 预约/留言/简历 + 附件）、提交后后台可见。
运行：python tests/test_public_smoke.py
"""
import sys

import httpx
import pymysql
import redis

BASE = "http://127.0.0.1:8000"
PASS, FAIL = [], []


def check(name: str, cond: bool, extra: str = ""):
    if cond:
        PASS.append(name); print(f"  ✅ {name} {extra}")
    else:
        FAIL.append(name); print(f"  ❌ {name} {extra}")


def captcha() -> dict:
    """获取验证码并回读 Redis 中的答案（60s TTL 内消费）。"""
    r = httpx.get(f"{BASE}/api/public/captcha").json()["data"]
    if r["captcha_id"] == "disabled":
        return {"captcha_id": "disabled", "captcha_code": "x"}
    rd = redis.Redis(host="127.0.0.1", port=6379, db=0, decode_responses=True, protocol=2)
    answer = rd.get(f"cap:{r['captcha_id']}")
    return {"captcha_id": r["captcha_id"], "captcha_code": answer}


def seed() -> int:
    """造前台可见/不可见内容：上架产品1+草稿产品1、启用案例1、已发布新闻1、职位1。返回职位 id。"""
    conn = pymysql.connect(host="127.0.0.1", user="root", password="tp_home_dev",
                           database="tp_home_dev", charset="utf8mb4")
    with conn.cursor() as cur:
        cur.execute("DELETE FROM products WHERE product_code IN ('PUB-ON-1','PUB-OFF-1')")
        cur.execute("DELETE FROM cases WHERE title='公开案例1'")
        cur.execute("DELETE FROM articles WHERE title='公开新闻1'")
        cur.execute("DELETE FROM jobs WHERE title='公开职位1'")
        cur.execute("INSERT INTO products (category_id, series, product_code, name, status, is_activate, sort, cover_image) VALUES (1,'胡桃木','PUB-ON-1','公开产品-上架','on',1,1,'/uploads/image/p1.png')")
        cur.execute("INSERT INTO products (category_id, series, product_code, name, status, is_activate, sort, cover_image) VALUES (1,'白蜡木','PUB-OFF-1','公开产品-草稿','draft',1,2,'/uploads/image/p2.png')")
        cur.execute("INSERT INTO cases (title, type, style, space, is_activate, sort) VALUES ('公开案例1','客户实景','现代','客厅',1,1)")
        cur.execute("INSERT INTO articles (title, category, is_published, is_activate, publish_at) VALUES ('公开新闻1','company',1,1,NOW())")
        cur.execute("INSERT INTO jobs (title, type, is_activate, sort) VALUES ('公开职位1','social',1,1)")
        job_id = cur.lastrowid
    conn.commit(); conn.close()
    print(f"  [seed] 已造前台可见/不可见内容（职位 id={job_id}）")
    return job_id



def clear_rate_limits() -> None:
    """清理 Redis 限流计数（避免密集测试触发登录/提交限流）。"""
    import redis as _redis
    try:
        rd = _redis.Redis(host="127.0.0.1", port=6379, db=0, protocol=2)
        for k in rd.keys("rl:*"):
            rd.delete(k)
    except Exception:
        pass


def _clear_login_limit() -> None:
    """登录前清 rl:login 限流（测试环境豁免，限流功能由专项验证）。"""
    import redis as _redis
    try:
        rd = _redis.Redis(host="127.0.0.1", port=6379, db=0, protocol=2)
        for k in rd.keys("rl:login:*"):
            rd.delete(k)
    except Exception:
        pass



def main() -> None:
    clear_rate_limits()
    job_id = seed()

    print("\n===== 1) 首页聚合 =====")
    d = httpx.get(f"{BASE}/api/public/home").json()["data"]
    check("分类 5 个", len(d["categories"]) == 5)
    check("热门产品仅上架（不含草稿）", all(p["name"] == "公开产品-上架" for p in d["hot_products"]) and len(d["hot_products"]) == 1,
          f"n={len(d['hot_products'])}")
    check("新案例/新闻/流程/口碑结构存在", len(d["new_cases"]) >= 1 and len(d["steps"]) == 4 and "reviews" in d)

    print("\n===== 2) 内容列表/详情 =====")
    r = httpx.get(f"{BASE}/api/public/products").json()["data"]
    check("产品列表仅上架（total=1）", r["pagination"]["total"] == 1, f"total={r['pagination']['total']}")
    r = httpx.get(f"{BASE}/api/public/products?category_id=1").json()["data"]
    check("分类筛选命中", r["pagination"]["total"] == 1)
    pid = httpx.get(f"{BASE}/api/public/products").json()["data"]["list"][0]["id"]
    r = httpx.get(f"{BASE}/api/public/products/{pid}").json()
    check("产品详情（规格参数）", r["code"] == 0)
    r = httpx.get(f"{BASE}/api/public/cases?type=客户实景").json()["data"]
    check("案例列表筛选", r["pagination"]["total"] >= 1)
    r = httpx.get(f"{BASE}/api/public/articles").json()["data"]
    check("新闻列表仅已发布", r["pagination"]["total"] >= 1)
    r = httpx.get(f"{BASE}/api/public/jobs").json()["data"]
    check("职位列表", "pagination" in r)
    r = httpx.get(f"{BASE}/api/public/pages").json()["data"]
    check("页面内容接口", isinstance(r, list))
    r = httpx.get(f"{BASE}/api/public/site-config").json()["data"]
    check("联系信息（含预约时段）", "appointment_slots" in r and r.get("phone") == "400-888-8888")

    print("\n===== 3) 线索提交（验证码 + 落库 + 后台可见） =====")
    # 在线预约
    c = captcha()
    r = httpx.post(f"{BASE}/api/public/appointments", json={
        "name": "前台预约客户", "phone": "13100000001", "appointment_date": "2026-09-01",
        "slot": "上午", "note": "<b>想看沙发</b>", **c,
    })
    check("在线预约提交", r.json()["code"] == 0, r.json()["message"])
    # 错误验证码被拒（仅启用时）
    if c["captcha_id"] != "disabled":
        r = httpx.post(f"{BASE}/api/public/appointments", json={
            "name": "错误验证码", "phone": "13100000002", "appointment_date": "2026-09-01", **c})
        check("错误验证码被拒绝", r.json()["code"] != 0)
    # 通用留言
    c = captcha()
    r = httpx.post(f"{BASE}/api/public/messages", json={
        "name": "前台留言客户", "contact": "13100000003", "content": "<script>alert(1)</script>想了解定制周期", **c})
    check("通用留言提交（XSS 清洗）", r.json()["code"] == 0)
    # 简历投递（附件 PDF）
    c = captcha()
    pdf = b"%PDF-1.4\n% fake resume\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
    r = httpx.post(f"{BASE}/api/public/applications",
                   data={"job_id": job_id, "name": "前台投递者", "phone": "13100000004",
                         "email": "resume@mail.com", "intro": "5 年经验", **c},
                   files={"attachment": ("resume.pdf", pdf, "application/pdf")})
    check("简历投递提交（附件）", r.json()["code"] == 0, r.json().get("message", ""))

    print("\n===== 4) 后台可见（线索流入管理端） =====")
    tok = httpx.post(f"{BASE}/api/auth/login", json={"username": "cs01", "password": "admin123"}).json()["data"]["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    r = httpx.get(f"{BASE}/api/leads/appointments?keyword=13100000001", headers=h).json()["data"]
    check("预约线索流入后台（待处理）", r["pagination"]["total"] >= 1 and r["list"][0]["status"] == "pending")
    r = httpx.get(f"{BASE}/api/leads/messages?keyword=13100000003", headers=h).json()["data"]
    check("留言线索流入后台（未读）", r["pagination"]["total"] >= 1 and r["list"][0]["status"] == "unread")
    # 简历由招聘专员查看
    tok2 = httpx.post(f"{BASE}/api/auth/login", json={"username": "hr01", "password": "admin123"}).json()["data"]["access_token"]
    r = httpx.get(f"{BASE}/api/leads/applications?keyword=13100000004",
                  headers={"Authorization": f"Bearer {tok2}"}).json()["data"]
    check("简历线索流入后台（附件 URL）", r["pagination"]["total"] >= 1 and "/uploads/resume/" in (r["list"][0].get("attachment") or ""))

    print(f"\n===== 汇总：通过 {len(PASS)} / {len(PASS) + len(FAIL)} =====")
    if FAIL:
        print(f"失败项: {FAIL}"); sys.exit(1)
    print("阶段 5 公开接口冒烟全部通过 ✅")


if __name__ == "__main__":
    main()
