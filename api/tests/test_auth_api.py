# -*- coding: utf-8 -*-
"""【代码段功能】认证域接口测试（BR-1）
登录（bcrypt 校验/禁用拦截/模糊报错）、me、menus RBAC、401 拦截、改密闭环。
"""
import pytest

from conftest import _login


# ---------- 登录 ----------

def test_login_four_roles(client):
    """四角色默认密码均可登录并返回双 Token（BR-1.1）。"""
    for u in ("admin", "editor01", "cs01", "hr01"):
        tok = _login(client, u)          # 登录（含限流清理）
        assert len(tok) > 20             # access_token 已签发


def test_login_wrong_password_unified(client):
    """错误密码统一模糊报错（不泄露用户是否存在）。"""
    r = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert r.json()["code"] != 0
    assert r.json()["message"] == "用户名或密码错误"


def test_login_rate_limit(client, monkeypatch):
    """登录限流：超阈值返回 code=3001（防刷，BR-1.3）。"""
    from core.config import settings
    from core.limiter import get_redis
    r = get_redis()
    if r is None:
        pytest.skip("Redis 不可用，限流降级")
    monkeypatch.setattr(settings, "rate_limit_per_minute", 3)
    # 清计数后连打 4 次，第 4 次应触发限流
    for k in r.keys("rl:login:*"):
        r.delete(k)
    codes = [client.post("/api/auth/login", json={"username": "x", "password": "y"}).json()["code"] for _ in range(4)]
    assert 3001 in codes


# ---------- 当前用户与菜单 ----------

def test_me(client, admin):
    """/me 返回当前用户（含角色权限集合，按钮级权限数据源）。"""
    r = client.get("/api/auth/me", headers=admin)
    assert r.json()["code"] == 0
    assert r.json()["data"]["username"] == "admin"
    assert r.json()["data"]["permissions"] == ["*"]


def test_menus_rbac(client, admin, editor, cs, hr):
    """菜单按权限矩阵过滤（PRD §8）。"""
    expect = {
        "admin": {"dashboard", "content", "recruit", "leads", "sys"},
        "editor01": {"content", "recruit"},
        "cs01": {"dashboard", "leads"},
        "hr01": {"dashboard", "recruit"},
    }
    for u, h in (("admin", admin), ("editor01", editor), ("cs01", cs), ("hr01", hr)):
        r = client.get("/api/auth/menus", headers=h)
        keys = {m["key"] for m in r.json()["data"]}
        assert keys == expect[u], f"{u}: {keys}"


# ---------- 鉴权拦截 ----------

def test_401_without_token(client):
    """无 Token 访问受保护接口 → 401。"""
    assert client.get("/api/auth/me").status_code == 401


def test_401_invalid_token(client):
    """伪造 Token → 401。"""
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer bad.token.here"})
    assert r.status_code == 401


def test_refresh_flow(client):
    """刷新令牌闭环：refresh → 新 access_token 可用。"""
    # 登录拿 refresh_token（登录前已清限流）
    _login(client, "admin")
    rr = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    refresh_tok = rr.json()["data"]["refresh_token"]
    r = client.post("/api/auth/refresh", json={"refresh_token": refresh_tok})
    assert r.json()["code"] == 0
    new_access = r.json()["data"]["access_token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_access}"}).status_code == 200


# ---------- 修改密码闭环 ----------

def test_change_password_flow(client, admin):
    """改密：旧密码校验 + 新密码 ≥6 位 + 新密码可登录 + 回滚。"""
    # admin123 → new123456
    r = client.post("/api/auth/change-password",
                    json={"old_password": "admin123", "new_password": "new123456"}, headers=admin)
    assert r.json()["code"] == 0
    try:
        tok = _login(client, "admin", "new123456")
        assert len(tok) > 20
        # 弱密码被拒
        r = client.post("/api/auth/change-password",
                        json={"old_password": "new123456", "new_password": "123"},
                        headers={"Authorization": f"Bearer {tok}"})
        assert r.json()["code"] != 0
    finally:
        # 兜底回滚 admin123
        try:
            t = _login(client, "admin", "new123456")
            client.post("/api/auth/change-password",
                        json={"old_password": "new123456", "new_password": "admin123"},
                        headers={"Authorization": f"Bearer {t}"})
        except AssertionError:
            pass
    # 确认回滚
    assert _login(client, "admin", "admin123")


def test_change_password_wrong_old(client, admin):
    """旧密码错误 → 拒绝。"""
    r = client.post("/api/auth/change-password",
                    json={"old_password": "wrong-old", "new_password": "new123456"}, headers=admin)
    assert r.json()["code"] != 0
