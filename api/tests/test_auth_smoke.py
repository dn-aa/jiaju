# -*- coding: utf-8 -*-
"""
阶段 1 · 认证接口冒烟验收脚本（BR-1）

【代码段功能】
  逐一验证：四角色登录 → 当前用户信息 → 菜单权限差异 → 未认证拦截 →
  修改密码闭环 → 头像上传 → 图形验证码。任一断言失败即报告具体步骤。

【运行方式】
  cd api && source ../.venv/Scripts/activate && python -m pytest tests/test_auth_smoke.py -v
  或直接运行: python tests/test_auth_smoke.py

【验收依据】
  PRD v2.2 BR-1.1~1.4 / 开发技术文档 v1.4 §6.2 / 数据库文档 v2.3 种子账号
"""
import io
import base64
import sys

import httpx

BASE = "http://127.0.0.1:8000"

# 种子账号（api/seed.py）：四角色，默认密码 admin123
ACCOUNTS = {
    "super": {"username": "admin", "password": "admin123", "expect_menus": {"dashboard", "content", "recruit", "leads", "sys"}},
    "editor": {"username": "editor01", "password": "admin123", "expect_menus": {"content", "recruit"}},  # 内容编辑：内容管理+职位
    "cs": {"username": "cs01", "password": "admin123", "expect_menus": {"dashboard", "leads"}},          # 客服：看板+线索
    "hr": {"username": "hr01", "password": "admin123", "expect_menus": {"dashboard", "recruit"}},        # 招聘：看板+招聘
}

PASS = []
FAIL = []


def check(name: str, cond: bool, extra: str = ""):
    """断言并记录结果：通过/失败均打印，便于人工审核。"""
    if cond:
        PASS.append(name)
        print(f"  ✅ {name} {extra}")
    else:
        FAIL.append(name)
        print(f"  ❌ {name} {extra}")


def login(username: str, password: str) -> tuple[httpx.Response, dict]:
    """调用登录接口，返回 (响应, JSON)。"""
    r = httpx.post(f"{BASE}/api/auth/login", json={"username": username, "password": password})
    return r, r.json()


def main() -> None:
    print("\n========== 1) 健康检查 与 图形验证码（FR-7.2 前置能力） ==========")
    r = httpx.get(f"{BASE}/api/public/health")
    check("健康检查 code=0", r.json().get("code") == 0, f"data={r.json().get('data')}")

    r = httpx.get(f"{BASE}/api/public/captcha")
    body = r.json()
    cap_ok = body.get("code") == 0 and body["data"]["captcha_id"] and body["data"]["image"].startswith("data:image/png;base64,")
    check("图形验证码可生成（PNG base64）", cap_ok)

    print("\n========== 2) 四角色登录（BR-1.1，bcrypt 校验） ==========")
    tokens: dict[str, str] = {}
    for role, acc in ACCOUNTS.items():
        r, body = login(acc["username"], acc["password"])
        ok = body.get("code") == 0 and body["data"]["access_token"] and body["data"]["refresh_token"]
        check(f"登录 {acc['username']}({role})", ok)
        if ok:
            tokens[role] = body["data"]["access_token"]
            # 校验 user 信息回显
            u = body["data"]["user"]
            check(f"  user 信息({u['username']})", u["username"] == acc["username"] and "role_id" in u)

    # 错误密码统一模糊报错（不泄露用户是否存在）
    r, body = login("admin", "wrong-pass")
    check("错误密码统一报错", body.get("code") != 0 and body.get("message") == "用户名或密码错误")

    print("\n========== 3) 当前用户 /me 与 菜单 /menus（BR-1.2 RBAC） ==========")
    headers_super = {"Authorization": f"Bearer {tokens['super']}"}
    r = httpx.get(f"{BASE}/api/auth/me", headers=headers_super)
    check("GET /me 返回当前用户", r.json().get("code") == 0 and r.json()["data"]["username"] == "admin")

    # 各角色菜单按权限矩阵过滤（PRD §8）
    for role, acc in ACCOUNTS.items():
        r = httpx.get(f"{BASE}/api/auth/menus", headers={"Authorization": f"Bearer {tokens[role]}"})
        menu_keys = {m["key"] for m in r.json().get("data", [])}
        check(f"菜单过滤 {role} = {sorted(menu_keys)}",
              menu_keys == acc["expect_menus"], f"期望 {sorted(acc['expect_menus'])}")

    print("\n========== 4) 未认证 / 无效 Token 拦截（BR-1.3） ==========")
    r = httpx.get(f"{BASE}/api/auth/me")
    check("无 Token → 401 拦截", r.status_code == 401, f"http={r.status_code}")
    r = httpx.get(f"{BASE}/api/auth/me", headers={"Authorization": "Bearer invalid.token.xxx"})
    check("伪造 Token → 401 拦截", r.status_code == 401, f"http={r.status_code}")

    print("\n========== 5) 修改密码闭环（BR-1.4） ==========")
    # 用超管账号：admin123 → new123 → 回滚 admin123
    r = httpx.post(f"{BASE}/api/auth/change-password",
                   json={"old_password": "admin123", "new_password": "new123456"},
                   headers=headers_super)
    check("改密成功（admin123→new123456）", r.json().get("code") == 0)

    r, body = login("admin", "new123456")
    check("新密码可登录", body.get("code") == 0)
    new_tok = body["data"]["access_token"]
    # 回滚密码
    httpx.post(f"{BASE}/api/auth/change-password",
               json={"old_password": "new123456", "new_password": "admin123"},
               headers={"Authorization": f"Bearer {new_tok}"})
    r, body = login("admin", "admin123")
    check("密码已回滚 admin123", body.get("code") == 0)
    # 弱密码校验（新密码 ≥6 位）
    r = httpx.post(f"{BASE}/api/auth/change-password",
                   json={"old_password": "admin123", "new_password": "123"},
                   headers=headers_super)
    check("弱密码(<6位)被拒绝", r.json().get("code") != 0)

    print("\n========== 6) 头像上传（BR-1.4，≤2MB 图片） ==========")
    # 用 Pillow 生成 8x8 PNG（墨色），作为合法图片用于上传测试
    from PIL import Image

    def png_bytes() -> bytes:
        buf = io.BytesIO()
        Image.new("RGB", (8, 8), "#1C1917").save(buf, "PNG")
        return buf.getvalue()

    files = {"file": ("avatar.png", png_bytes(), "image/png")}
    r = httpx.post(f"{BASE}/api/files/avatar", files=files, headers=headers_super)
    body = r.json()
    check("头像上传成功并回写 URL", body.get("code") == 0 and body["data"]["url"].startswith("/uploads/image/"), f"url={body.get('data',{}).get('url')}")

    # 类型白名单拦截（.exe 伪装图片 → 4001）
    files = {"file": ("evil.png", b"MZ\x90\x00evil", "image/png")}
    r = httpx.post(f"{BASE}/api/files/upload", files={**files, "kind": (None, "image")}, headers=headers_super)
    check("恶意文件（MZ 头）被拦截", r.json().get("code") == 4001, f"code={r.json().get('code')}")

    print(f"\n========== 汇总：通过 {len(PASS)} / 共 {len(PASS) + len(FAIL)} ==========")
    if FAIL:
        print(f"失败项: {FAIL}")
        sys.exit(1)
    print("阶段 1 认证冒烟全部通过 ✅")


if __name__ == "__main__":
    main()
