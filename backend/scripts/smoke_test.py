"""T5 live smoke test against a real uvicorn server (port 8010, SQLite)."""
import json
import random
import sys
import urllib.request

BASE = "http://localhost:8010/api/v1"
PASSWORD = "Passw0rd123"


def req(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw.decode(errors="replace")


def phone(prefix="13"):
    return prefix + "".join(random.choices("0123456789", k=9))


def main():
    results = []

    def check(name, cond, extra=""):
        results.append((name, bool(cond), extra))
        print(("PASS" if cond else "FAIL"), name, extra)

    # 1. healthz
    s, b = req("GET", "/../healthz".replace("/../", "/") if False else "")
    # healthz is at root, not under /api/v1
    with urllib.request.urlopen("http://localhost:8010/healthz", timeout=5) as r:
        hb = json.loads(r.read())
    check("SYS-001 healthz", hb.get("status") == "ok" and hb.get("database") == "up", str(hb))

    # 2. admin login (seed)
    s, b = req("POST", "/auth/login", body={"account": "13800000000", "password": "Admin123456"})
    check("ADMIN login", s == 200 and "access_token" in (b or {}), f"{s} {str(b)[:80]}")
    admin_tok = b["access_token"]

    # 3. register patient
    p_phone = phone()
    s, b = req("POST", "/auth/register", body={"phone": p_phone, "password": PASSWORD, "full_name": "烟测患者", "role": "patient"})
    check("AUTH-001 register patient", s == 201 and "access_token" in (b or {}), f"{s}")
    p_tok = b["access_token"]
    s, b = req("GET", "/users/me", token=p_tok)
    p_id = b["user"]["id"]
    check("AUTH-016 users/me", s == 200, f"{s}")

    # 4. update patient profile
    s, b = req("PUT", "/users/me/patient-profile", token=p_tok, body={"gender": "female", "birth_date": "1990-01-01", "emergency_contact_name": "张三", "emergency_contact_phone": "13911112222", "medical_history": "高血压"})
    check("PAT-001 patient profile", s == 200 and b.get("gender") == "female", f"{s}")

    # 5. register therapist + profile + admin approve
    t_phone = phone("15")
    s, b = req("POST", "/auth/register", body={"phone": t_phone, "password": PASSWORD, "full_name": "烟测康复师", "role": "therapist"})
    t_tok = b["access_token"]
    s, b = req("PUT", "/users/me/therapist-profile", token=t_tok, body={"organization": "市医院", "license_type": "康复治疗师", "license_number": "ZC-SMOKE-001"})
    t_id = b["user_id"]
    s, b = req("POST", f"/admin/therapists/{t_id}/review", token=admin_tok, body={"approve": True})
    check("THP-002 therapist approved", s == 200 and b.get("status") == "approved", f"{s}")

    # 6. patient requests match, admin approves
    s, b = req("POST", "/matches/request", token=p_tok, body={"therapist_id": t_id})
    match_id = b["id"]
    s, b = req("POST", f"/admin/matches/{match_id}/review", token=admin_tok, body={"approve": True})
    check("MTC-007 match approved", s == 200 and b.get("status") == "approved", f"{s}")

    # 7. patient reports health (heart rate high enough to trigger alert with default? default HR threshold unknown - just report spo2=85 -> critical alert per test-cases)
    s, b = req("POST", "/health/records", token=p_tok, body={"record_type": "spo2", "value": 85})
    check("HLTH-001 report spo2", s == 201 and b.get("value") == 85, f"{s}")

    # 8. therapist sees patient's health + alerts (bound)
    s, b = req("GET", f"/health/records?patient_id={p_id}", token=t_tok)
    check("RBAC-008 therapist sees bound data", s == 200 and len(b.get("items", [])) >= 1, f"{s} items={len(b.get('items', []))}")
    s, b = req("GET", "/alerts", token=t_tok)
    check("ALR-003 therapist aggregate alerts", s == 200 and len(b) >= 1, f"{s} alerts={len(b)}")

    # 9. unbound therapist cannot access another patient (create second patient, try)
    s2, b2 = req("POST", "/auth/register", body={"phone": phone(), "password": PASSWORD, "full_name": "烟测患者2", "role": "patient"})
    p2_tok = b2["access_token"]
    s, b = req("GET", "/users/me", token=p2_tok)
    p2_id = b["user"]["id"]
    s, b = req("GET", f"/health/records?patient_id={p2_id}", token=t_tok)
    check("RBAC-009 unbound access denied", s == 403, f"{s}")

    # 10. patient cannot hit admin
    s, b = req("GET", "/admin/statistics", token=p_tok)
    check("RBAC-001 patient->admin denied", s == 403, f"{s}")

    # 11. message between bound pair
    s, b = req("POST", "/messages", token=p_tok, body={"recipient_id": t_id, "content": "你好康复师"})
    check("MSG-001 patient->therapist msg", s == 201, f"{s}")
    s, b = req("GET", "/messages/unread-count", token=t_tok)
    check("MSG-002 unread count", s == 200 and b.get("unread_count", 0) >= 1, f"{s} {b}")

    # 12. plan flow
    s, b = req("POST", "/plans", token=t_tok, body={"patient_id": p_id, "title": "膝关节康复", "description": "术后", "tasks": [{"title": "直腿抬高", "duration_minutes": 10}]})
    check("PLN-001 create plan", s == 201 and len(b.get("tasks", [])) == 1, f"{s}")
    plan_id = b["id"]
    task_id = b["tasks"][0]["id"]
    s, b = req("POST", f"/plans/tasks/{task_id}/checkin", token=p_tok, body={"note": "完成"})
    check("PLN-005 checkin", s == 201, f"{s}")
    s, b = req("GET", f"/plans/{plan_id}/progress", token=t_tok)
    check("PLN-007 progress", s == 200 and b.get("completion_rate") == 100.0 and b.get("completed_tasks") == 1, f"{s} {b}")

    # 13. trends
    s, b = req("GET", "/health/trends?record_type=spo2&days=7", token=p_tok)
    pts = (b or {}).get("points") or []
    check("HLTH-008 trends", s == 200 and pts and pts[-1].get("count", 0) >= 1 and pts[-1].get("avg") == 85.0, f"{s} {b}")

    # 14. audit log
    s, b = req("GET", "/admin/audit-logs?size=5", token=admin_tok)
    check("ADM-008 audit logs", s == 200 and len(b) >= 1, f"{s} n={len(b)}")

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n=== SMOKE RESULT: {passed}/{total} passed ===")
    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
