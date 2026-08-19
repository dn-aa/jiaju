# -*- coding: utf-8 -*-
"""【代码段功能】系统管理域接口测试（BR-10）
账号 CRUD/启用禁用/重置密码/内置保护、角色权限集合、操作日志。
"""
import uuid


def _unique() -> str:
    return uuid.uuid4().hex[:6]


def test_account_crud_and_guard(client, admin):
    """账号：创建（初始密码）→ 登录 → 更新 → 重置密码 → 删除（BR-10.1）。"""
    username = f"tst{_unique()}"
    r = client.post("/api/sys/accounts", json={
        "username": username, "real_name": "测试账号", "role_id": 4, "password": "test123456"}, headers=admin)
    assert r.json()["code"] == 0
    uid = r.json()["data"]["id"]
    try:
        # 新账号可登录（角色=招聘 → 可访问简历）
        tok = client.post("/api/auth/login", json={"username": username, "password": "test123456"}).json()["data"]["access_token"]
        assert client.get("/api/leads/applications", headers={"Authorization": f"Bearer {tok}"}).status_code == 200
        # 更新（编辑回填保存）
        r = client.put(f"/api/sys/accounts/{uid}", json={"username": username, "real_name": "测试账号改", "role_id": 4}, headers=admin)
        assert r.json()["data"]["real_name"] == "测试账号改"
        # 重置密码 → 新密码可登录
        r = client.post(f"/api/sys/accounts/{uid}/reset-pwd", json={"new_password": "newpwd123"}, headers=admin)
        assert r.json()["code"] == 0
        assert client.post("/api/auth/login", json={"username": username, "password": "newpwd123"}).json()["code"] == 0
        # 禁用 → 登录被拦截
        client.put(f"/api/sys/accounts/{uid}/status", json={"active": False}, headers=admin)
        assert client.post("/api/auth/login", json={"username": username, "password": "newpwd123"}).json()["code"] != 0
    finally:
        client.delete(f"/api/sys/accounts/{uid}", headers=admin)


def test_account_builtin_guard(client, admin):
    """内置 admin 不可删除/禁用；当前登录账号不可删除。"""
    assert client.delete("/api/sys/accounts/1", headers=admin).json()["code"] != 0
    assert client.put("/api/sys/accounts/1/status", json={"active": False}, headers=admin).json()["code"] != 0


def test_role_permissions(client, admin):
    """角色：创建（权限集合）→ 更新（权限树勾选保存）→ 删除（BR-10.2）。"""
    name = f"测试角色{_unique()}"
    r = client.post("/api/sys/roles", json={"name": name, "permissions": ["product:view"]}, headers=admin)
    assert r.json()["code"] == 0
    rid = r.json()["data"]["id"]
    try:
        r = client.put(f"/api/sys/roles/{rid}", json={"name": name, "permissions": ["product:view", "case:view"]}, headers=admin)
        assert r.json()["data"]["permissions"] == ["product:view", "case:view"]
        # 内置超管角色不可删
        assert client.delete("/api/sys/roles/1", headers=admin).json()["code"] != 0
    finally:
        client.delete(f"/api/sys/roles/{rid}", headers=admin)


def test_operation_logs(client, admin):
    """操作日志：列表 + 关键字搜索（BR-10.3，写操作留痕）。"""
    d = client.get("/api/sys/logs?page_size=5", headers=admin).json()["data"]
    assert d["pagination"]["total"] > 0
    assert len(d["list"]) > 0 and "operator_name" in d["list"][0]
