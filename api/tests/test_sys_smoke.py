# -*- coding: utf-8 -*-
"""【代码段功能】阶段 4 · 系统管理冒烟验收脚本（BR-10）

覆盖：账号 CRUD/启用禁用/重置密码/内置保护、角色 CRUD/权限集合、
操作日志查询、权限隔离（非超管 403）。运行：python tests/test_sys_smoke.py
"""
import sys

import httpx

BASE = "http://127.0.0.1:8000"
PASS, FAIL = [], []


def check(name: str, cond: bool, extra: str = ""):
    if cond:
        PASS.append(name); print(f"  ✅ {name} {extra}")
    else:
        FAIL.append(name); print(f"  ❌ {name} {extra}")


def login(u, p):
    r = httpx.post(f"{BASE}/api/auth/login", json={"username": u, "password": p})
    return r.json()


def main() -> None:
    admin = login("admin", "admin123")["data"]["access_token"]
    ha = {"Authorization": f"Bearer {admin}"}
    cs = login("cs01", "admin123")["data"]["access_token"]
    hc = {"Authorization": f"Bearer {cs}"}

    print("\n===== 1) 账号管理（BR-10.1） =====")
    r = httpx.get(f"{BASE}/api/sys/accounts?page_size=20", headers=ha)
    d = r.json()["data"]
    check("账号列表 total>=4（四角色种子）", d["pagination"]["total"] >= 4)
    check("列表含角色名", all("role_name" in a for a in d["list"]))

    # 创建账号（初始密码 ≥6 位）
    r = httpx.post(f"{BASE}/api/sys/accounts", headers=ha, json={
        "username": "tester01", "real_name": "测试专员", "phone": "13000000000",
        "role_id": 4, "password": "test123456",
    })
    check("创建账号", r.json()["code"] == 0, f"id={r.json()['data'].get('id')}")
    # 新账号可登录（角色=招聘，可访问简历）
    r = login("tester01", "test123456")
    check("新账号可登录", r["code"] == 0)
    tok_t = r["data"]["access_token"]
    r = httpx.get(f"{BASE}/api/leads/applications", headers={"Authorization": f"Bearer {tok_t}"})
    check("新账号角色权限生效（可见简历）", r.status_code == 200)

    # 更新账号（编辑回填保存）
    uid = httpx.get(f"{BASE}/api/sys/accounts?keyword=tester01", headers=ha).json()["data"]["list"][0]["id"]
    r = httpx.put(f"{BASE}/api/sys/accounts/{uid}", headers=ha, json={
        "username": "tester01", "real_name": "测试专员（改）", "role_id": 4})
    check("更新账号姓名", r.json()["data"]["real_name"] == "测试专员（改）")

    # 禁用 → 登录被拦截；启用 → 恢复
    r = httpx.put(f"{BASE}/api/sys/accounts/{uid}/status", headers=ha, json={"active": False})
    check("禁用账号", r.json()["code"] == 0)
    r = login("tester01", "test123456")
    check("禁用后登录被拦截", r["code"] != 0 and "禁用" in r["message"])
    httpx.put(f"{BASE}/api/sys/accounts/{uid}/status", headers=ha, json={"active": True})
    r = login("tester01", "test123456")
    check("启用后恢复登录", r["code"] == 0)

    # 重置密码：自定义 → 新密码登录；随机 → 返回明文
    r = httpx.post(f"{BASE}/api/sys/accounts/{uid}/reset-pwd", headers=ha, json={"new_password": "newpwd123"})
    check("重置密码（自定义）", r.json()["code"] == 0)
    check("新密码可登录", login("tester01", "newpwd123")["code"] == 0)
    r = httpx.post(f"{BASE}/api/sys/accounts/{uid}/reset-pwd", headers=ha, json={"new_password": None})
    rand_pwd = r.json()["data"]["new_password"]
    check("重置密码（随机 8 位返回）", r.json()["code"] == 0 and len(rand_pwd) == 8, f"pwd={rand_pwd}")

    # 内置保护：admin 不可删除/禁用；不可删除当前登录账号
    r = httpx.delete(f"{BASE}/api/sys/accounts/1", headers=ha)
    check("删除内置 admin 被拦截", r.json()["code"] != 0)
    r = httpx.put(f"{BASE}/api/sys/accounts/1/status", headers=ha, json={"active": False})
    check("禁用内置 admin 被拦截", r.json()["code"] != 0)

    # 删除测试账号
    r = httpx.delete(f"{BASE}/api/sys/accounts/{uid}", headers=ha)
    check("删除测试账号", r.json()["code"] == 0)

    print("\n===== 2) 角色管理（BR-10.2） =====")
    r = httpx.get(f"{BASE}/api/sys/roles", headers=ha)
    roles = r.json()["data"]
    check("角色列表 >=4", len(roles) >= 4)
    super_role = next((x for x in roles if x["name"] == "超级管理员"), None)
    check("超管角色权限=[*]", super_role and super_role["permissions"] == ["*"])
    # 创建角色 + 配置权限集合
    r = httpx.post(f"{BASE}/api/sys/roles", headers=ha, json={
        "name": "测试角色", "description": "冒烟测试", "permissions": ["product:view", "product:edit"]})
    rid = r.json()["data"]["id"]
    check("创建角色", r.json()["code"] == 0, f"id={rid}")
    # 更新权限集合（权限树勾选保存）
    r = httpx.put(f"{BASE}/api/sys/roles/{rid}", headers=ha, json={
        "name": "测试角色", "permissions": ["product:view", "case:view", "dashboard:view"]})
    check("更新角色权限集合", r.json()["data"]["permissions"] == ["product:view", "case:view", "dashboard:view"])

    print("\n===== 3) 操作日志（BR-10.3） =====")
    r = httpx.get(f"{BASE}/api/sys/logs?page_size=20", headers=ha)
    d = r.json()["data"]
    check("日志列表 total>50（阶段 2-4 写操作累计）", d["pagination"]["total"] > 50, f"total={d['pagination']['total']}")
    r = httpx.get(f"{BASE}/api/sys/logs?keyword=重置密码", headers=ha)
    check("关键字搜索命中（重置密码）", r.json()["data"]["pagination"]["total"] >= 1)
    r = httpx.get(f"{BASE}/api/sys/logs?keyword=无此操作", headers=ha)
    check("无命中关键字返回 0", r.json()["data"]["pagination"]["total"] == 0)

    print("\n===== 4) 权限隔离 =====")
    r = httpx.get(f"{BASE}/api/sys/accounts", headers=hc)
    check("客服访问账号管理 → 403", r.status_code == 403)
    r = httpx.get(f"{BASE}/api/sys/roles", headers=hc)
    check("客服访问角色管理 → 403", r.status_code == 403)
    r = httpx.get(f"{BASE}/api/sys/logs", headers=hc)
    check("客服访问操作日志 → 403", r.status_code == 403)

    print(f"\n===== 汇总：通过 {len(PASS)} / {len(PASS) + len(FAIL)} =====")
    if FAIL:
        print(f"失败项: {FAIL}"); sys.exit(1)
    print("阶段 4 系统管理冒烟全部通过 ✅")


if __name__ == "__main__":
    main()
