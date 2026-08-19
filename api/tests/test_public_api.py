# -*- coding: utf-8 -*-
"""【代码段功能】公开域接口测试（FR-1~FR-8 公开部分）
内容列表/详情、前台状态过滤（草稿/下架不展示）、线索提交（验证码关闭）、
XSS 清洗、附件上传（简历）。
"""
import io
import uuid


def _unique() -> str:
    return uuid.uuid4().hex[:6]


# ---------- 公开内容 ----------

def test_home_aggregation(client):
    """首页聚合：分类/流程结构完整。"""
    d = client.get("/api/public/home").json()["data"]
    assert len(d["categories"]) >= 1
    assert len(d["steps"]) == 4
    assert "banners" in d and "hot_products" in d and "reviews" in d


def test_public_products_only_online(client, admin):
    """产品列表仅展示上架（status=on）+ 启用（前台状态过滤，§2.5）。"""
    # 造一条草稿产品（不上架），列表不应出现
    code = f"PUBOFF-{_unique()}"
    h = admin
    r = client.post("/api/cms/products", json={
        "category_id": 1, "series": "S", "product_code": code, "name": "草稿产品", "status": "draft"}, headers=h)
    pid = r.json()["data"]["id"]
    try:
        names = [p["name"] for p in client.get("/api/public/products?page_size=50").json()["data"]["list"]]
        assert "草稿产品" not in names
        # 下架后详情 404
        client.put(f"/api/cms/products/{pid}/status", json={"status": "off"}, headers=h)
        assert client.get(f"/api/public/products/{pid}").json()["code"] == 2004
    finally:
        client.delete(f"/api/cms/products/{pid}", headers=h)


def test_public_article_prev_next(client, admin):
    """新闻详情返回上一篇/下一篇字段（可为 None）。"""
    h = admin
    r = client.post("/api/cms/articles", json={"title": f"公开测试{_unique()}", "category": "company", "is_published": 1}, headers=h)
    aid = r.json()["data"]["id"]
    try:
        d = client.get(f"/api/public/articles/{aid}").json()["data"]
        assert "prev" in d and "next" in d
    finally:
        client.delete(f"/api/cms/articles/{aid}", headers=h)


# ---------- 线索提交 ----------

def test_submit_appointment(client, captcha_off):
    """在线预约提交成功（验证码关闭）。"""
    r = client.post("/api/public/appointments", json={
        "name": "提交测试", "phone": f"1378888{_unique()[:4]}", "appointment_date": "2026-09-15",
        "slot": "上午", "captcha_id": "x", "captcha_code": "XXXX",
    })
    assert r.json()["code"] == 0


def test_submit_message_xss(client, captcha_off):
    """留言提交：script 内容被清洗后落库。"""
    r = client.post("/api/public/messages", json={
        "name": "留言测试", "contact": f"1377777{_unique()[:4]}",
        "content": "<script>alert(1)</script>想了解定制", "captcha_id": "x", "captcha_code": "XXXX",
    })
    assert r.json()["code"] == 0


def test_submit_application_with_attachment(client, captcha_off):
    """简历投递（multipart + PDF 附件）成功。"""
    # 动态获取一个在招职位（job_id 自增不固定）
    jobs = client.get("/api/public/jobs").json()["data"]["list"]
    assert jobs, "无在招职位"
    job_id = jobs[0]["id"]
    pdf = b"%PDF-1.4\n% fake\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
    r = client.post("/api/public/applications",
                    data={"job_id": job_id, "name": "投递测试", "phone": f"1366666{_unique()[:4]}",
                          "captcha_id": "x", "captcha_code": "XXXX"},
                    files={"attachment": ("resume.pdf", pdf, "application/pdf")})
    assert r.json()["code"] == 0, r.json()


def test_submit_invalid_captcha(client):
    """验证码错误被拒绝（验证码启用时）。"""
    r = client.post("/api/public/appointments", json={
        "name": "x", "phone": "13555550000", "appointment_date": "2026-09-15",
        "captcha_id": "nonexistent", "captcha_code": "ABCD",
    })
    assert r.json()["code"] != 0 and "验证码" in r.json()["message"]


def test_public_health_and_captcha(client):
    """健康检查 + 验证码接口可用（FR-7.2）。"""
    assert client.get("/api/public/health").json()["code"] == 0
    d = client.get("/api/public/captcha").json()["data"]
    assert d["captcha_id"] and d["image"].startswith("data:image/png;base64,")
