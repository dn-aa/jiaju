# -*- coding: utf-8 -*-
"""【代码段功能】RBAC 权限矩阵测试（PRD §8 / 附录 E）
四角色 × 各域接口：允许访问 200 / 越权访问 403。
"""
import pytest

# 角色 → 各域接口的期望结果（200=可访问，403=禁止）
# key 为接口说明，值为 (请求方法, 路径)
CASES = {
    "cms_products": ("get", "/api/cms/products"),
    "cms_cases": ("get", "/api/cms/cases"),
    "cms_articles": ("get", "/api/cms/articles"),
    "cms_jobs": ("get", "/api/cms/jobs"),
    "cms_pages": ("get", "/api/cms/pages"),
    "leads_appointments": ("get", "/api/leads/appointments"),
    "leads_messages": ("get", "/api/leads/messages"),
    "leads_applications": ("get", "/api/leads/applications"),
    "dashboard": ("get", "/api/dashboard/lead-stats"),
    "sys_accounts": ("get", "/api/sys/accounts"),
    "sys_roles": ("get", "/api/sys/roles"),
    "sys_logs": ("get", "/api/sys/logs"),
}

# 权限矩阵（1=允许，0=403）
MATRIX = {
    "admin": {k: 200 for k in CASES},
    "editor01": {
        "cms_products": 200, "cms_cases": 200, "cms_articles": 200, "cms_jobs": 200, "cms_pages": 200,
        "leads_appointments": 403, "leads_messages": 403, "leads_applications": 403,
        "dashboard": 403, "sys_accounts": 403, "sys_roles": 403, "sys_logs": 403,
    },
    "cs01": {
        "cms_products": 403, "cms_cases": 403, "cms_articles": 403, "cms_jobs": 403, "cms_pages": 403,
        "leads_appointments": 200, "leads_messages": 200, "leads_applications": 403,
        "dashboard": 200, "sys_accounts": 403, "sys_roles": 403, "sys_logs": 403,
    },
    "hr01": {
        "cms_products": 403, "cms_cases": 403, "cms_articles": 403, "cms_jobs": 200, "cms_pages": 403,
        "leads_appointments": 403, "leads_messages": 403, "leads_applications": 200,
        "dashboard": 200, "sys_accounts": 403, "sys_roles": 403, "sys_logs": 403,
    },
}


@pytest.mark.parametrize("role", ["admin", "editor01", "cs01", "hr01"])
def test_permission_matrix(client, role, admin, editor, cs, hr, request):
    """逐条验证权限矩阵（200/403）。"""
    headers = {"admin": admin, "editor01": editor, "cs01": cs, "hr01": hr}[role]
    for name, expect in MATRIX[role].items():
        method, path = CASES[name]
        r = getattr(client, method)(path, headers=headers)
        assert r.status_code == expect, f"{role} {name} 期望 {expect} 实际 {r.status_code}"
