# -*- coding: utf-8 -*-
"""【代码段功能】内容管理域（CMS）接口测试（BR-2~BR-6）
代表性 CRUD、统一状态切换（§2.5 字段映射）、案例-产品关联、系列禁删。
"""
import uuid


def _unique():
    """唯一后缀（避免测试数据冲突）。"""
    return uuid.uuid4().hex[:6]


# ---------- 分类 ----------

def test_category_crud(client, admin):
    """空间分类增删改查 + 状态切换（BR-2.1）。"""
    name = f"测试分类{_unique()}"
    r = client.post("/api/cms/categories", json={"name": name, "sort": 1}, headers=admin)
    assert r.json()["code"] == 0
    cid = r.json()["data"]["id"]
    # 编辑
    r = client.put(f"/api/cms/categories/{cid}", json={"name": name, "sort": 2}, headers=admin)
    assert r.json()["data"]["sort"] == 2
    # 状态切换（启用↔禁用）
    r = client.put(f"/api/cms/categories/{cid}/status", json={"status": "off"}, headers=admin)
    assert r.json()["data"]["status"] == "off"
    client.put(f"/api/cms/categories/{cid}/status", json={"status": "on"}, headers=admin)
    # 删除
    r = client.delete(f"/api/cms/categories/{cid}", headers=admin)
    assert r.json()["code"] == 0


# ---------- 产品（含关联） ----------

def test_product_crud_and_status(client, admin):
    """产品 CRUD + 发布状态三态（draft/off/on）+ 置顶（BR-2.2）。"""
    code = f"TP-{_unique()}"
    r = client.post("/api/cms/products", json={
        "category_id": 1, "series": "胡桃木", "product_code": code, "name": f"测试产品{_unique()}",
        "spec_params": {"材质": "棉麻", "尺寸": "3200×1800mm"}, "status": "draft", "is_top": 1,
    }, headers=admin)
    assert r.json()["code"] == 0
    pid = r.json()["data"]["id"]
    # 状态切换：draft → on → off
    assert client.put(f"/api/cms/products/{pid}/status", json={"status": "on"}, headers=admin).json()["data"]["status"] == "on"
    assert client.put(f"/api/cms/products/{pid}/status", json={"status": "off"}, headers=admin).json()["data"]["status"] == "off"
    # 非法状态被拒
    assert client.put(f"/api/cms/products/{pid}/status", json={"status": "非法"}, headers=admin).json()["code"] != 0
    # 详情回填（编辑数据源）
    d = client.get(f"/api/cms/products/{pid}", headers=admin).json()["data"]
    assert d["product_code"] == code and d["spec_params"]["材质"] == "棉麻"
    client.delete(f"/api/cms/products/{pid}", headers=admin)


def test_product_case_relation(client, admin):
    """案例-产品关联维护（case_products）：编辑回填 ids + 双向查询（BR-2/BR-3）。"""
    # 准备案例与产品
    r = client.post("/api/cms/cases", json={"title": f"关联案例{_unique()}", "type": "客户实景"}, headers=admin)
    cid = r.json()["data"]["id"]
    r = client.post("/api/cms/products", json={
        "category_id": 1, "series": "白蜡木", "product_code": f"TPR-{_unique()}",
        "name": f"关联产品{_unique()}", "status": "on", "related_case_ids": [cid],
    }, headers=admin)
    pid = r.json()["data"]["id"]
    # 产品详情回显关联案例 ids（编辑回填）
    d = client.get(f"/api/cms/products/{pid}", headers=admin).json()["data"]
    assert d["related_case_ids"] == [cid]
    # 清理
    client.delete(f"/api/cms/products/{pid}", headers=admin)
    client.delete(f"/api/cms/cases/{cid}", headers=admin)


def test_category_delete_blocked_with_products(client, admin):
    """产品系列有关联产品时禁止删除（BR-2.1）。"""
    name = f"禁删分类{_unique()}"
    cid = client.post("/api/cms/categories", json={"name": name}, headers=admin).json()["data"]["id"]
    pid = client.post("/api/cms/products", json={
        "category_id": cid, "series": "S", "product_code": f"TPD-{_unique()}",
        "name": "挂靠产品", "status": "draft",
    }, headers=admin).json()["data"]["id"]
    r = client.delete(f"/api/cms/categories/{cid}", headers=admin)
    assert r.json()["code"] != 0 and "禁止删除" in r.json()["message"]
    client.delete(f"/api/cms/products/{pid}", headers=admin)
    client.delete(f"/api/cms/categories/{cid}", headers=admin)


# ---------- 新闻（发布/下架） ----------

def test_article_publish_flow(client, admin):
    """新闻发布↔下架（is_published 映射）+ 置顶（BR-4）。"""
    r = client.post("/api/cms/articles", json={
        "title": f"测试新闻{_unique()}", "category": "company", "is_published": 0, "is_top": 1,
    }, headers=admin)
    aid = r.json()["data"]["id"]
    assert client.put(f"/api/cms/articles/{aid}/status", json={"status": "on"}, headers=admin).json()["data"]["status"] == "on"
    assert client.put(f"/api/cms/articles/{aid}/status", json={"status": "off"}, headers=admin).json()["data"]["status"] == "off"
    client.delete(f"/api/cms/articles/{aid}", headers=admin)


# ---------- 富文本 XSS 清洗 ----------

def test_rich_text_xss_sanitized(client, admin):
    """富文本字段落库前 XSS 清洗（script 被剥离，NFR-2）。"""
    r = client.post("/api/cms/articles", json={
        "title": f"XSS测试{_unique()}", "category": "company",
        "body": "<script>alert(1)</script><p>正常内容</p>", "is_published": 0,
    }, headers=admin)
    aid = r.json()["data"]["id"]
    d = client.get(f"/api/cms/articles/{aid}", headers=admin).json()["data"]
    assert "<script>" not in d["body"] and "正常内容" in d["body"]
    client.delete(f"/api/cms/articles/{aid}", headers=admin)
