# -*- coding: utf-8 -*-
"""【代码段功能】阶段 3 · 线索管理 + 数据看板冒烟验收脚本（BR-5.2/7/8/9）

覆盖：三类线索列表（脱敏）、状态流转、角色数据维度隔离、看板统计
（总数/趋势/北极星去重）、明细下钻。运行：python tests/test_leads_smoke.py
"""
import sys
from datetime import datetime

import httpx
import pymysql

BASE = "http://127.0.0.1:8000"
PASS, FAIL = [], []


def check(name: str, cond: bool, extra: str = ""):
    if cond:
        PASS.append(name); print(f"  ✅ {name} {extra}")
    else:
        FAIL.append(name); print(f"  ❌ {name} {extra}")


def login(u, p):
    r = httpx.post(f"{BASE}/api/auth/login", json={"username": u, "password": p})
    return r.json()["data"]["access_token"]


def seed_data() -> None:
    """直连数据库插入测试线索（3 预约/2 留言/2 简历，含同一手机号 13811110000 用于去重验证）。"""
    conn = pymysql.connect(host="127.0.0.1", user="root", password="tp_home_dev",
                           database="tp_home_dev", charset="utf8mb4")
    with conn.cursor() as cur:
        # pymysql 默认不支持多语句，逐条清理旧测试数据
        cur.execute("DELETE FROM appointments")
        cur.execute("DELETE FROM messages")
        cur.execute("DELETE FROM applications")
        cur.executemany(
            "INSERT INTO appointments (name, phone, appointment_date, slot, note, status) VALUES (%s,%s,%s,%s,%s,%s)",
            [("林女士", "13811110000", "2026-08-25", "上午", "看沙发", "pending"),
             ("王先生", "13922220000", "2026-08-26", "下午", "", "contacted"),
             ("陈女士", "13811110000", "2026-08-27", "晚间", "看全屋方案", "pending")])
        cur.executemany(
            "INSERT INTO messages (name, contact, content, status) VALUES (%s,%s,%s,%s)",
            [("赵女士", "13733330000", "想了解电视柜定制周期", "unread"),
             ("孙先生", "13644440000", "咨询儿童房设计", "read")])
        cur.executemany(
            "INSERT INTO applications (job_id, name, phone, email, intro, status) VALUES (%s,%s,%s,%s,%s,%s)",
            [(1, "周先生", "13811110000", "zhou@mail.com", "5 年全屋定制经验", "pending"),
             (1, "吴女士", "13555550000", "wu@mail.com", "应届生", "viewed")])
    conn.commit(); conn.close()
    print("  [seed] 已插入测试线索：预约x3 / 留言x2 / 简历x2")


def main() -> None:
    seed_data()
    admin = login("admin", "admin123")
    cs = login("cs01", "admin123")
    hr = login("hr01", "admin123")
    # 三个角色的鉴权头（显式赋值，避免生成器解包歧义）
    ha = {"Authorization": f"Bearer {admin}"}
    hc = {"Authorization": f"Bearer {cs}"}
    hh = {"Authorization": f"Bearer {hr}"}

    print("\n===== 1) 列表 + 脱敏（NFR-3） =====")
    r = httpx.get(f"{BASE}/api/leads/appointments", headers=hc)
    d = r.json()["data"]
    item = d["list"][0]
    check("客服预约列表 total=3", d["pagination"]["total"] == 3)
    check("列表姓名脱敏（林**）", item["name"].startswith("林") and "*" in item["name"], item["name"])
    check("列表手机号脱敏（138****0000）", "*" in item["phone"], item["phone"])
    r = httpx.get(f"{BASE}/api/leads/appointments/{item['id']}", headers=hc)
    check("详情返回完整手机号", r.json()["data"]["phone"].startswith("1381") and "*" not in r.json()["data"]["phone"])
    r = httpx.get(f"{BASE}/api/leads/messages", headers=hc)
    check("客服留言列表 total=2", r.json()["data"]["pagination"]["total"] == 2)
    r = httpx.get(f"{BASE}/api/leads/applications", headers=hh)
    check("招聘简历列表 total=2", r.json()["data"]["pagination"]["total"] == 2)

    print("\n===== 2) 角色数据维度隔离（PRD §8） =====")
    r = httpx.get(f"{BASE}/api/leads/applications", headers=hc)
    check("客服访问简历 → 403", r.status_code == 403)
    r = httpx.get(f"{BASE}/api/leads/appointments", headers=hh)
    check("招聘访问预约 → 403", r.status_code == 403)
    r = httpx.get(f"{BASE}/api/leads/appointments", headers=ha)
    check("超管可见全部预约", r.status_code == 200)

    print("\n===== 3) 状态流转（BR-7.2/8.2/5.2 状态机） =====")
    # 从列表取真实 id（自增 id 不固定，避免硬编码）
    aid = httpx.get(f"{BASE}/api/leads/appointments", headers=hc).json()["data"]["list"][0]["id"]
    mid = httpx.get(f"{BASE}/api/leads/messages", headers=hc).json()["data"]["list"][0]["id"]
    appid = httpx.get(f"{BASE}/api/leads/applications", headers=hh).json()["data"]["list"][0]["id"]
    r = httpx.put(f"{BASE}/api/leads/appointments/{aid}/status", headers=hc,
                  json={"status": "contacted", "note": "已电话联系，约定到店"})
    check("预约 pending→contacted", r.json()["code"] == 0)
    r = httpx.put(f"{BASE}/api/leads/appointments/{aid}/status", headers=hc,
                  json={"status": "done", "note": "已完成看样"})
    check("预约 contacted→done", r.json()["code"] == 0)
    r = httpx.put(f"{BASE}/api/leads/appointments/{aid}/status", headers=hc,
                  json={"status": "非法状态"})
    check("非法状态被拒绝", r.json()["code"] != 0)
    r = httpx.put(f"{BASE}/api/leads/messages/{mid}/status", headers=hc,
                  json={"status": "read", "note": "已读"})
    r = httpx.put(f"{BASE}/api/leads/messages/{mid}/status", headers=hc, json={"status": "done"})
    check("留言 unread→read→done", r.json()["code"] == 0)
    r = httpx.put(f"{BASE}/api/leads/applications/{appid}/status", headers=hh,
                  json={"status": "viewed", "note": "已查看"})
    r = httpx.put(f"{BASE}/api/leads/applications/{appid}/status", headers=hh, json={"status": "contacted"})
    check("简历 pending→viewed→contacted", r.json()["code"] == 0)

    print("\n===== 4) 数据看板（BR-9） =====")
    r = httpx.get(f"{BASE}/api/dashboard/lead-stats?range=7", headers=hc)
    d = r.json()["data"]
    check("客服看板 scope=[appointment,message]", d["scope"] == ["appointment", "message"])
    check("客服预约 total=3", d["types"]["appointment"]["total"] == 3)
    r = httpx.get(f"{BASE}/api/dashboard/lead-stats?range=7", headers=hh)
    d = r.json()["data"]
    check("招聘看板 scope=[application]", d["scope"] == ["application"])
    check("招聘简历 total=2", d["types"]["application"]["total"] == 2)
    r = httpx.get(f"{BASE}/api/dashboard/lead-stats?range=7", headers=ha)
    d = r.json()["data"]
    check("超管看板 scope=全部三类", d["scope"] == ["appointment", "message", "application"])
    check("超管预约 total=3 / 简历 total=2", d["types"]["appointment"]["total"] == 3 and d["types"]["application"]["total"] == 2)
    check("趋势 7 天（含今日 3+2+2=7 条）", len(d["trend"]) == 7)
    check("北极星有效线索数去重（5 个唯一手机号）", d["effective_leads"] == 5, f"n={d['effective_leads']}")

    print("\n===== 5) 明细下钻（BR-9.2） =====")
    r = httpx.get(f"{BASE}/api/dashboard/lead-list?type=appointment", headers=hc)
    check("客服下钻预约 total=3", r.json()["data"]["pagination"]["total"] == 3)
    r = httpx.get(f"{BASE}/api/dashboard/lead-list?type=application", headers=hc)
    check("客服下钻简历 → 403（维度隔离）", r.status_code == 403)

    # 编辑角色无看板权限
    ed = login("editor01", "admin123")
    r = httpx.get(f"{BASE}/api/dashboard/lead-stats", headers={"Authorization": f"Bearer {ed}"})
    check("内容编辑访问看板 → 403", r.status_code == 403)

    print(f"\n===== 汇总：通过 {len(PASS)} / {len(PASS) + len(FAIL)} =====")
    if FAIL:
        print(f"失败项: {FAIL}"); sys.exit(1)
    print("阶段 3 线索+看板冒烟全部通过 ✅")


if __name__ == "__main__":
    main()
