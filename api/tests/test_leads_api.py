# -*- coding: utf-8 -*-
"""【代码段功能】线索域接口测试（BR-5.2/7/8）
列表脱敏、详情完整、状态流转（枚举校验）、非法状态拒绝。
使用独立手机号数据（1379999xxxx 段），结束后清理。
"""
import uuid


def _phone() -> str:
    """生成测试手机号（1379999xxxx 段，避免与真实数据冲突）。"""
    return f"1379999{uuid.uuid4().hex[:4]}"


def _seed(client, admin):
    """直连数据库造线索（预约/留言/简历各 1 条，返回 id 与手机号）。"""
    import pymysql
    phone = _phone()
    conn = pymysql.connect(host="127.0.0.1", user="root", password="tp_home_dev",
                           database="tp_home_dev", charset="utf8mb4")
    with conn.cursor() as cur:
        cur.execute("INSERT INTO appointments (name, phone, appointment_date, status) VALUES (%s,%s,'2026-09-10','pending')", ("测试林", phone))
        aid = cur.lastrowid
        cur.execute("INSERT INTO messages (name, contact, content, status) VALUES (%s,%s,'测试留言','unread')", ("测试赵", phone))
        mid = cur.lastrowid
        cur.execute("INSERT INTO applications (job_id, name, phone, status) VALUES (1,%s,%s,'pending')", ("测试周", phone))
        apid = cur.lastrowid
    conn.commit(); conn.close()
    return {"phone": phone, "appointment_id": aid, "message_id": mid, "application_id": apid}


def _cleanup(ids: dict):
    import pymysql
    conn = pymysql.connect(host="127.0.0.1", user="root", password="tp_home_dev",
                           database="tp_home_dev", charset="utf8mb4")
    with conn.cursor() as cur:
        cur.execute("DELETE FROM appointments WHERE id=%s", (ids["appointment_id"],))
        cur.execute("DELETE FROM messages WHERE id=%s", (ids["message_id"],))
        cur.execute("DELETE FROM applications WHERE id=%s", (ids["application_id"],))
    conn.commit(); conn.close()


def test_leads_list_masked(client, cs, hr):
    """列表脱敏：姓名/手机号打码（NFR-3）。"""
    r = client.get("/api/leads/appointments", headers=cs)
    item = r.json()["data"]["list"][0]
    assert "*" in item["name"] or len(item["name"]) <= 1
    assert "*" in item["phone"] or len(item["phone"]) <= 4


def test_leads_status_flow(client, cs, hr):
    """三类线索状态流转 + 非法状态拒绝（技术文档 §7.1 状态机）。"""
    ids = _seed(client, cs)
    try:
        # 预约：pending→contacted→done；非法状态拒绝
        r = client.put(f"/api/leads/appointments/{ids['appointment_id']}/status",
                       json={"status": "contacted", "note": "已联系"}, headers=cs)
        assert r.json()["code"] == 0
        assert client.put(f"/api/leads/appointments/{ids['appointment_id']}/status",
                          json={"status": "非法"}, headers=cs).json()["code"] != 0
        # 留言：unread→read
        assert client.put(f"/api/leads/messages/{ids['message_id']}/status",
                          json={"status": "read"}, headers=cs).json()["code"] == 0
        # 简历：pending→viewed（招聘专员）
        assert client.put(f"/api/leads/applications/{ids['application_id']}/status",
                          json={"status": "viewed"}, headers=hr).json()["code"] == 0
    finally:
        _cleanup(ids)


def test_leads_detail_full(client, cs):
    """详情返回完整手机号（处理 Drawer 数据源，授权角色可见）。"""
    ids = _seed(client, cs)
    try:
        r = client.get(f"/api/leads/appointments/{ids['appointment_id']}", headers=cs)
        phone = r.json()["data"]["phone"]
        assert phone.startswith("1379999") and "*" not in phone
    finally:
        _cleanup(ids)
