"""T5 QA extended tests: patient profile, matching, plans, messages, alerts, admin.

Covers PRD modules not fully exercised by the original suite:
  F2 患者档案、F3 康复师档案、F4 对接匹配、F5 健康数据边界、F6 康复计划、
  F7 消息、F8 告警、F9 管理后台。
"""
import random
import uuid

from fastapi.testclient import TestClient

PASSWORD = "Passw0rd123"
ADMIN_ACCOUNT = "13800000000"
ADMIN_PASSWORD = "Admin123456"


def _phone(prefix: str = "13") -> str:
    return prefix + "".join(random.choices("0123456789", k=9))


def _register(client: TestClient, role: str = "patient", phone: str | None = None, **extra):
    payload = {
        "phone": phone or _phone(),
        "password": PASSWORD,
        "full_name": "测试" + uuid.uuid4().hex[:4],
        "role": role,
        **extra,
    }
    return client.post("/api/v1/auth/register", json=payload)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _admin(client: TestClient) -> dict:
    return client.post(
        "/api/v1/auth/login",
        json={"account": ADMIN_ACCOUNT, "password": ADMIN_PASSWORD},
    ).json()


def _user_id(client: TestClient, token: str) -> str:
    me = client.get("/api/v1/users/me", headers=_auth(token))
    assert me.status_code == 200, me.text
    return me.json()["user"]["id"]


def _setup_bound_pair(client: TestClient):
    """Register patient + therapist, approve therapist, approve match. Returns dict of tokens/ids."""
    p = _register(client).json()
    t = _register(client, role="therapist", phone=_phone("15")).json()
    admin = _admin(client)
    patient_id = _user_id(client, p["access_token"])

    tp = client.put(
        "/api/v1/users/me/therapist-profile",
        headers=_auth(t["access_token"]),
        json={
            "organization": "市康复医院",
            "license_type": "康复治疗师",
            "license_number": "ZC-" + uuid.uuid4().hex[:8],
            "specialties": "骨科康复",
            "bio": "资深康复师",
        },
    ).json()
    rv = client.post(
        f"/api/v1/admin/therapists/{tp['user_id']}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": True},
    )
    assert rv.status_code == 200, rv.text

    m = client.post(
        "/api/v1/matches/request",
        headers=_auth(p["access_token"]),
        json={"therapist_id": tp["user_id"]},
    ).json()
    mr = client.post(
        f"/api/v1/admin/matches/{m['id']}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": True},
    )
    assert mr.status_code == 200, mr.text

    return {
        "patient": p,
        "patient_id": patient_id,
        "therapist": t,
        "therapist_id": tp["user_id"],
        "admin": admin,
        "match_id": m["id"],
    }


# ---------- F2 患者档案 ----------
def test_patient_profile_upsert_and_self_view(client: TestClient):
    p = _register(client).json()
    h = _auth(p["access_token"])

    resp = client.put(
        "/api/v1/users/me/patient-profile",
        headers=h,
        json={
            "gender": "male",
            "birth_date": "1985-06-15",
            "contact_phone": "13900001111",
            "emergency_contact_name": "李四",
            "emergency_contact_phone": "13900002222",
            "medical_history": "高血压 3 年",
            "discharge_summary": "ICU 出院",
            "allergies": "青霉素",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["gender"] == "male"
    assert body["emergency_contact_name"] == "李四"

    # self full view via /users/me/patient-profile
    me = client.get("/api/v1/users/me/patient-profile", headers=h)
    assert me.status_code == 200, me.text
    assert me.json()["emergency_contact_phone"] == "13900002222"

    # PATCH /users/me keeps basic fields
    up = client.patch(
        "/api/v1/users/me", headers=h, json={"full_name": "改名患者"}
    )
    assert up.status_code == 200, up.text
    assert up.json()["full_name"] == "改名患者"


def test_patient_profile_requires_patient_role(client: TestClient):
    t = _register(client, role="therapist", phone=_phone("15")).json()
    resp = client.put(
        "/api/v1/users/me/patient-profile",
        headers=_auth(t["access_token"]),
        json={"gender": "male"},
    )
    assert resp.status_code == 403, resp.text


def test_self_patient_profile_not_in_therapist_view(client: TestClient):
    """Therapist view of a bound patient profile masks emergency contacts (PRD F2.4)."""
    pair = _setup_bound_pair(client)
    pid = pair["patient_id"]

    resp = client.get(
        f"/api/v1/patients/{pid}",
        headers=_auth(pair["therapist"]["access_token"]),
    )
    assert resp.status_code == 200, resp.text
    view = resp.json()
    assert "emergency_contact_name" not in view
    assert "emergency_contact_phone" not in view
    assert view["user_id"] == pid


# ---------- F3 康复师档案 ----------
def test_therapist_profile_edit_resets_to_pending(client: TestClient):
    t = _register(client, role="therapist", phone=_phone("15")).json()
    h = _auth(t["access_token"])
    admin = _admin(client)

    tp = client.put(
        "/api/v1/users/me/therapist-profile",
        headers=h,
        json={
            "organization": "康复医院A",
            "license_type": "康复治疗师",
            "license_number": "ZC-123456",
            "specialties": "神经康复",
            "bio": "简介",
        },
    ).json()
    assert tp["status"] == "pending"

    rv = client.post(
        f"/api/v1/admin/therapists/{tp['user_id']}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": True},
    )
    assert rv.status_code == 200
    assert rv.json()["status"] == "approved"

    # edit license -> status resets to pending
    tp2 = client.put(
        "/api/v1/users/me/therapist-profile",
        headers=h,
        json={"license_number": "ZC-999999"},
    ).json()
    assert tp2["status"] == "pending", tp2


def test_therapist_reject_requires_reason(client: TestClient):
    t = _register(client, role="therapist", phone=_phone("15")).json()
    admin = _admin(client)
    tp = client.put(
        "/api/v1/users/me/therapist-profile",
        headers=_auth(t["access_token"]),
        json={"organization": "X", "license_type": "康复治疗师", "license_number": "ZC-1"},
    ).json()

    resp = client.post(
        f"/api/v1/admin/therapists/{tp['user_id']}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": False, "note": ""},
    )
    assert resp.status_code == 422, resp.text

    ok = client.post(
        f"/api/v1/admin/therapists/{tp['user_id']}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": False, "note": "材料不完整"},
    )
    assert ok.status_code == 200
    assert ok.json()["status"] == "rejected"

    # rejected therapist not in public list
    lst = client.get("/api/v1/therapists", headers=_auth(_register(client).json()["access_token"]))
    assert lst.status_code == 200
    assert all(item["user_id"] != tp["user_id"] for item in lst.json())


# ---------- F4 对接匹配 ----------
def test_match_request_duplicate_and_unbind_flow(client: TestClient):
    pair = _setup_bound_pair(client)
    p, t, admin = pair["patient"], pair["therapist"], pair["admin"]
    tid = pair["therapist_id"]

    # duplicate pending/approved request rejected
    resp = client.post(
        "/api/v1/matches/request",
        headers=_auth(p["access_token"]),
        json={"therapist_id": tid},
    )
    assert resp.status_code == 409, resp.text

    # unbind request
    ub = client.post(
        f"/api/v1/matches/{pair['match_id']}/unbind",
        headers=_auth(p["access_token"]),
        json={"note": "已康复"},
    )
    assert ub.status_code == 200, ub.text
    assert ub.json()["status"] == "pending_unbind"

    # admin approves unbind -> terminated
    rv = client.post(
        f"/api/v1/admin/matches/{pair['match_id']}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": True},
    )
    assert rv.status_code == 200
    assert rv.json()["status"] == "terminated"

    # after unbind, therapist loses access
    resp = client.get(
        f"/api/v1/health/records?patient_id={pair['patient_id']}",
        headers=_auth(t["access_token"]),
    )
    assert resp.status_code == 403, resp.text


def test_admin_direct_match_and_second_match_conflict(client: TestClient):
    p = _register(client).json()
    t1 = _register(client, role="therapist", phone=_phone("15")).json()
    t2 = _register(client, role="therapist", phone=_phone("16")).json()
    admin = _admin(client)
    p_id = _user_id(client, p["access_token"])
    t1_id = _user_id(client, t1["access_token"])
    t2_id = _user_id(client, t2["access_token"])

    # approve both therapists
    for t in (t1, t2):
        tp = client.put(
            "/api/v1/users/me/therapist-profile",
            headers=_auth(t["access_token"]),
            json={"organization": "O", "license_type": "康复治疗师", "license_number": "ZC-" + uuid.uuid4().hex[:6]},
        ).json()
        client.post(
            f"/api/v1/admin/therapists/{tp['user_id']}/review",
            headers=_auth(admin["access_token"]),
            json={"approve": True},
        )

    # admin direct match
    m = client.post(
        "/api/v1/matches/request",
        headers=_auth(admin["access_token"]),
        json={"patient_id": p_id, "therapist_id": t1_id},
    )
    assert m.status_code == 201, m.text
    assert m.json()["status"] == "approved"

    # second match for same patient rejected
    m2 = client.post(
        "/api/v1/matches/request",
        headers=_auth(admin["access_token"]),
        json={"patient_id": p_id, "therapist_id": t2_id},
    )
    assert m2.status_code == 409, m2.text


# ---------- F5 健康数据边界 ----------
def test_health_record_range_validation(client: TestClient):
    p = _register(client).json()
    h = _auth(p["access_token"])

    # out of range rejected
    assert client.post("/api/v1/health/records", headers=h, json={"record_type": "temperature", "value": 50}).status_code == 422
    assert client.post("/api/v1/health/records", headers=h, json={"record_type": "spo2", "value": 20}).status_code == 422
    assert client.post("/api/v1/health/records", headers=h, json={"record_type": "blood_pressure", "systolic": 300, "diastolic": 110}).status_code == 422
    # missing fields rejected
    assert client.post("/api/v1/health/records", headers=h, json={"record_type": "blood_pressure", "systolic": 120}).status_code == 422
    assert client.post("/api/v1/health/records", headers=h, json={"record_type": "heart_rate"}).status_code == 422
    # valid accepted
    ok = client.post("/api/v1/health/records", headers=h, json={"record_type": "temperature", "value": 36.6})
    assert ok.status_code == 201, ok.text


def test_health_records_only_self_for_patient(client: TestClient):
    p1 = _register(client).json()
    p2 = _register(client, phone=_phone("17")).json()
    p2_id = _user_id(client, p2["access_token"])
    client.post("/api/v1/health/records", headers=_auth(p1["access_token"]), json={"record_type": "heart_rate", "value": 72})

    # patient passing another patient_id only ever sees own records (param ignored for patients)
    resp = client.get(
        f"/api/v1/health/records?patient_id={p2_id}",
        headers=_auth(p1["access_token"]),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 1
    assert all(item["patient_id"] == _user_id(client, p1["access_token"]) for item in body["items"])


def test_health_trends_aggregation(client: TestClient):
    p = _register(client).json()
    h = _auth(p["access_token"])
    client.post("/api/v1/health/records", headers=h, json={"record_type": "heart_rate", "value": 60})
    client.post("/api/v1/health/records", headers=h, json={"record_type": "heart_rate", "value": 80})
    client.post("/api/v1/health/records", headers=h, json={"record_type": "heart_rate", "value": 100})

    resp = client.get("/api/v1/health/trends?record_type=heart_rate&days=7", headers=h)
    assert resp.status_code == 200, resp.text
    points = resp.json()["points"]
    assert points, "trend points expected"
    # avg of 60/80/100 = 80, min=60, max=100
    today = points[-1]
    assert today["avg"] == 80.0
    assert today["min"] == 60.0
    assert today["max"] == 100.0
    assert today["count"] == 3

    # unsupported type rejected
    bad = client.get("/api/v1/health/trends?record_type=xyz&days=7", headers=h)
    assert bad.status_code == 422, bad.text


# ---------- F6 康复计划 ----------
def test_plan_full_flow(client: TestClient):
    pair = _setup_bound_pair(client)
    p, t = pair["patient"], pair["therapist"]
    pid = pair["patient_id"]
    tid = pair["therapist_id"]

    # therapist creates plan
    plan = client.post(
        "/api/v1/plans",
        headers=_auth(t["access_token"]),
        json={
            "patient_id": pid,
            "title": "肩关节康复计划",
            "goal": "恢复肩关节活动度",
            "start_date": "2026-08-01",
            "end_date": "2026-09-01",
            "tasks": [
                {"title": "肩部拉伸", "frequency": "每天", "duration_minutes": 10},
                {"title": "弹力带训练", "frequency": "隔天", "duration_minutes": 15},
            ],
        },
    )
    assert plan.status_code == 201, plan.text
    plan_body = plan.json()
    assert plan_body["therapist_id"] == tid
    assert len(plan_body["tasks"]) == 2
    plan_id = plan_body["id"]
    task_ids = [task["id"] for task in plan_body["tasks"]]

    # patient sees own plan
    lst = client.get("/api/v1/plans", headers=_auth(p["access_token"]))
    assert lst.status_code == 200
    assert any(x["id"] == plan_id for x in lst.json())

    # therapist cannot create plan for unbound patient
    other = _register(client, phone=_phone("17")).json()
    other_id = _user_id(client, other["access_token"])
    bad = client.post(
        "/api/v1/plans",
        headers=_auth(t["access_token"]),
        json={"patient_id": other_id, "title": "越权计划"},
    )
    assert bad.status_code == 403, bad.text

    # patient checks in twice (idempotent same-day)
    c1 = client.post(
        f"/api/v1/plans/tasks/{task_ids[0]}/checkin",
        headers=_auth(p["access_token"]),
        json={"completed": True, "note": "完成"},
    )
    assert c1.status_code == 201, c1.text
    c2 = client.post(
        f"/api/v1/plans/tasks/{task_ids[0]}/checkin",
        headers=_auth(p["access_token"]),
        json={"completed": True, "note": "完成（更新）"},
    )
    assert c2.status_code == 201, c2.text
    assert c2.json()["id"] == c1.json()["id"]  # idempotent

    # progress: 1 of 2 tasks completed
    prog = client.get(f"/api/v1/plans/{plan_id}/progress", headers=_auth(t["access_token"]))
    assert prog.status_code == 200, prog.text
    assert prog.json()["total_tasks"] == 2
    assert prog.json()["completed_tasks"] == 1
    assert prog.json()["completion_rate"] == 50.0

    # therapist adds a task, updates plan title
    at = client.post(
        f"/api/v1/plans/{plan_id}/tasks",
        headers=_auth(t["access_token"]),
        json={"title": "冰敷", "frequency": "每天", "duration_minutes": 5},
    )
    assert at.status_code == 201, at.text
    up = client.patch(
        f"/api/v1/plans/{plan_id}",
        headers=_auth(t["access_token"]),
        json={"title": "肩关节康复计划 v2"},
    )
    assert up.status_code == 200, up.text
    assert up.json()["title"] == "肩关节康复计划 v2"
    assert len(up.json()["tasks"]) == 3

    # patient cannot modify plan
    forbid = client.patch(
        f"/api/v1/plans/{plan_id}",
        headers=_auth(p["access_token"]),
        json={"title": "hack"},
    )
    assert forbid.status_code == 403, forbid.text


# ---------- F7 消息 ----------
def test_message_flow_and_unread(client: TestClient):
    pair = _setup_bound_pair(client)
    p, t = pair["patient"], pair["therapist"]
    tid = pair["therapist_id"]

    # therapist sends to patient
    m1 = client.post(
        "/api/v1/messages",
        headers=_auth(t["access_token"]),
        json={"recipient_id": pair["patient_id"], "content": "今天感觉如何？"},
    )
    assert m1.status_code == 201, m1.text

    # patient unread count = 1
    uc = client.get("/api/v1/messages/unread-count", headers=_auth(p["access_token"]))
    assert uc.status_code == 200
    assert uc.json()["unread_count"] == 1

    # patient reads conversation -> unread cleared
    conv = client.get("/api/v1/messages/conversations", headers=_auth(p["access_token"]))
    assert conv.status_code == 200, conv.text
    assert conv.json()[0]["unread_count"] == 1

    lst = client.get(f"/api/v1/messages?peer={tid}", headers=_auth(p["access_token"]))
    assert lst.status_code == 200, lst.text
    assert lst.json()[0]["is_read"] is True
    uc2 = client.get("/api/v1/messages/unread-count", headers=_auth(p["access_token"]))
    assert uc2.json()["unread_count"] == 0

    # patient replies
    m2 = client.post(
        "/api/v1/messages",
        headers=_auth(p["access_token"]),
        json={"recipient_id": tid, "content": "好多了，谢谢！"},
    )
    assert m2.status_code == 201, m2.text


def test_message_rbac_cross_relation_denied(client: TestClient):
    pair = _setup_bound_pair(client)
    other = _register(client, phone=_phone("17")).json()
    other_id = _user_id(client, other["access_token"])

    # therapist cannot message unbound patient
    resp = client.post(
        "/api/v1/messages",
        headers=_auth(pair["therapist"]["access_token"]),
        json={"recipient_id": other_id, "content": "越权消息"},
    )
    assert resp.status_code == 403, resp.text

    # cannot message self
    resp = client.post(
        "/api/v1/messages",
        headers=_auth(pair["patient"]["access_token"]),
        json={"recipient_id": pair["patient_id"], "content": "自言自语"},
    )
    assert resp.status_code == 400, resp.text

    # admin cannot message
    resp = client.post(
        "/api/v1/messages",
        headers=_auth(pair["admin"]["access_token"]),
        json={"recipient_id": pair["patient_id"], "content": "管理员消息"},
    )
    assert resp.status_code == 403, resp.text


# ---------- F8 告警 ----------
def test_alert_thresholds_and_handle(client: TestClient):
    pair = _setup_bound_pair(client)
    p, t = pair["patient"], pair["therapist"]
    h = _auth(p["access_token"])

    # spo2 below 90 -> critical alert
    r1 = client.post("/api/v1/health/records", headers=h, json={"record_type": "spo2", "value": 85})
    assert r1.status_code == 201, r1.text

    alerts = client.get("/api/v1/alerts", headers=_auth(t["access_token"]))
    assert alerts.status_code == 200, alerts.text
    lst = alerts.json()
    assert len(lst) == 1, lst
    assert lst[0]["severity"] == "critical"
    assert lst[0]["alert_type"] == "spo2:lt"
    alert_id = lst[0]["id"]

    # patient cannot handle
    forbid = client.patch(
        f"/api/v1/alerts/{alert_id}/handle",
        headers=h,
        json={"note": "患者处理"},
    )
    assert forbid.status_code == 403, forbid.text

    # therapist handles
    hd = client.patch(
        f"/api/v1/alerts/{alert_id}/handle",
        headers=_auth(t["access_token"]),
        json={"note": "已电话联系患者"},
    )
    assert hd.status_code == 200, hd.text
    assert hd.json()["status"] == "handled"
    assert hd.json()["handler_note"] == "已电话联系患者"

    # status filter works
    filtered = client.get("/api/v1/alerts?status=open", headers=_auth(t["access_token"]))
    assert filtered.json() == []

    # normal value produces no alert
    client.post("/api/v1/health/records", headers=h, json={"record_type": "spo2", "value": 98})
    alerts2 = client.get("/api/v1/alerts?patient_id=" + pair["patient_id"], headers=_auth(t["access_token"]))
    assert len(alerts2.json()) == 1  # unchanged


def test_alert_admin_override_threshold(client: TestClient):
    """Admin customizes threshold; alert evaluation uses DB rule (PRD F8.1/F9.3)."""
    pair = _setup_bound_pair(client)
    p = pair["patient"]
    admin = pair["admin"]
    h = _auth(p["access_token"])
    ah = _auth(admin["access_token"])

    # tighten heart_rate:gt to 100
    rv = client.put(
        "/api/v1/admin/thresholds/heart_rate:gt",
        headers=ah,
        json={"key": "heart_rate:gt", "metric": "heart_rate", "direction": "gt", "value": 100, "severity": "warning", "message": "心率过快(自定义)"},
    )
    assert rv.status_code == 200, rv.text

    # 110 bpm triggers custom rule; 90 does not
    client.post("/api/v1/health/records", headers=h, json={"record_type": "heart_rate", "value": 110})
    client.post("/api/v1/health/records", headers=h, json={"record_type": "heart_rate", "value": 90})

    alerts = client.get("/api/v1/alerts", headers=_auth(pair["therapist"]["access_token"]))
    hr_alerts = [a for a in alerts.json() if a["alert_type"] == "heart_rate:gt"]
    assert len(hr_alerts) == 1, hr_alerts
    assert "自定义" in hr_alerts[0]["message"]

    # restore default
    d = client.delete("/api/v1/admin/thresholds/heart_rate:gt", headers=ah)
    assert d.status_code == 204, d.text


# ---------- F9 管理后台 ----------
def test_admin_user_status_and_stats(client: TestClient):
    p = _register(client).json()
    admin = _admin(client)
    ah = _auth(admin["access_token"])
    me = client.get("/api/v1/users/me", headers=_auth(p["access_token"])).json()
    pid = me["user"]["id"]
    pphone = me["user"]["phone"]

    # deactivate patient
    rv = client.patch(f"/api/v1/admin/users/{pid}/status?is_active=false", headers=ah)
    assert rv.status_code == 200, rv.text
    assert rv.json()["is_active"] is False

    # deactivated user cannot login
    lg = client.post("/api/v1/auth/login", json={"account": pphone, "password": PASSWORD})
    assert lg.status_code == 403, lg.text

    # admin cannot deactivate self
    me = client.get("/api/v1/users/me", headers=ah).json()
    self_rv = client.patch(f"/api/v1/admin/users/{me['user']['id']}/status?is_active=false", headers=ah)
    assert self_rv.status_code == 400, self_rv.text

    # stats endpoint
    stats = client.get("/api/v1/admin/statistics", headers=ah)
    assert stats.status_code == 200, stats.text
    body = stats.json()
    assert body["users"]["patient"] >= 1
    assert "health_records" in body

    # audit logs contain auth.login for admin
    logs = client.get("/api/v1/admin/audit-logs", headers=ah)
    assert logs.status_code == 200, logs.text
    assert any(log["action"] == "auth.login" for log in logs.json())


def test_admin_rbac_denied_for_non_admin(client: TestClient):
    p = _register(client).json()
    h = _auth(p["access_token"])
    assert client.get("/api/v1/admin/users", headers=h).status_code == 403
    assert client.get("/api/v1/admin/statistics", headers=h).status_code == 403
    assert client.get("/api/v1/admin/audit-logs", headers=h).status_code == 403
    assert client.get("/api/v1/admin/thresholds", headers=h).status_code == 403
    assert client.get("/api/v1/admin/matches", headers=h).status_code == 403


def test_healthz_and_openapi(client: TestClient):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["database"] == "up"
