# -*- coding: utf-8 -*-
"""【代码段功能】数据看板接口测试（BR-9）
角色数据维度隔离、北极星指标去重（独立手机号数据）。
"""


def test_dashboard_scope_by_role(client, cs, hr, admin):
    """看板数据范围按角色限定（scope 字段）。"""
    r = client.get("/api/dashboard/lead-stats?range=7", headers=cs).json()["data"]
    assert r["scope"] == ["appointment", "message"]
    r = client.get("/api/dashboard/lead-stats?range=7", headers=hr).json()["data"]
    assert r["scope"] == ["application"]
    r = client.get("/api/dashboard/lead-stats?range=7", headers=admin).json()["data"]
    assert r["scope"] == ["appointment", "message", "application"]


def test_dashboard_trend_shape(client, cs):
    """趋势数组长度与 range 一致（无数据日期补 0）。"""
    r = client.get("/api/dashboard/lead-stats?range=7", headers=cs).json()["data"]
    assert len(r["trend"]) == 7
    assert all("date" in row and "appointment" in row for row in r["trend"])


def test_dashboard_drill_down(client, cs):
    """明细下钻：客服可下钻预约、不可下钻简历（维度隔离）。"""
    assert client.get("/api/dashboard/lead-list?type=appointment", headers=cs).status_code == 200
    assert client.get("/api/dashboard/lead-list?type=application", headers=cs).status_code == 403


def test_dashboard_editor_forbidden(client, editor):
    """内容编辑无看板权限 → 403。"""
    assert client.get("/api/dashboard/lead-stats", headers=editor).status_code == 403
