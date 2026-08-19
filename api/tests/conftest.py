# -*- coding: utf-8 -*-
"""【代码段功能】pytest 公共夹具（阶段 6）
- client：FastAPI TestClient（内存运行应用，无需外部服务）
- auth_header(username)：登录并返回鉴权头
- captcha_off：monkeypatch 关闭验证码（表单提交测试用）
- 说明：测试基于开发库（tp_home_dev），数据断言使用相对值/独立数据，
  与真实服务冒烟脚本（tests/test_*_smoke.py）互为补充。
"""
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="module")
def client():
    """TestClient 实例（模块级复用）。"""
    with TestClient(app) as c:
        yield c


def _login(client: TestClient, username: str, password: str = "admin123") -> str:
    """登录并返回 access_token（登录前清限流键，避免密集测试触发防刷）。"""
    try:
        import redis
        rd = redis.Redis(host="127.0.0.1", port=6379, db=0, protocol=2)
        for k in rd.keys("rl:login:*"):
            rd.delete(k)
    except Exception:
        pass
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.json()["code"] == 0, f"登录失败 {username}: {r.json()}"
    return r.json()["data"]["access_token"]


@pytest.fixture(scope="module")
def admin(client) -> dict:
    """超管鉴权头。"""
    return {"Authorization": f"Bearer {_login(client, 'admin')}"}


@pytest.fixture(scope="module")
def editor(client) -> dict:
    """内容编辑鉴权头（product/case/article/job/content 权限）。"""
    return {"Authorization": f"Bearer {_login(client, 'editor01')}"}


@pytest.fixture(scope="module")
def cs(client) -> dict:
    """客服鉴权头（leads:appointment/message + dashboard）。"""
    return {"Authorization": f"Bearer {_login(client, 'cs01')}"}


@pytest.fixture(scope="module")
def hr(client) -> dict:
    """招聘鉴权头（job + leads:application + dashboard）。"""
    return {"Authorization": f"Bearer {_login(client, 'hr01')}"}


@pytest.fixture()
def captcha_off(monkeypatch):
    """关闭图形验证码（表单提交/接口冒烟测试用）。"""
    monkeypatch.setattr("core.config.settings.captcha_enabled", False)
    yield
