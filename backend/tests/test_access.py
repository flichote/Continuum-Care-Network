"""Data-level RBAC tests: bound therapist access vs. unbound denial (PRD F2.4/F4/F5.5/F8.5)."""
import uuid

from fastapi.testclient import TestClient

PASSWORD = "Passw0rd123"


def _register(client: TestClient, phone: str, role: str = "patient", **extra):
    payload = {
        "phone": phone,
        "password": PASSWORD,
        "full_name": "测试" + uuid.uuid4().hex[:4],
        "role": role,
        **extra,
    }
    return client.post("/api/v1/auth/register", json=payload)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _setup_bound_pair(client: TestClient, patient_phone: str, therapist_phone: str):
    """Register patient + therapist, submit therapist profile, admin approves both
    therapist and the patient-therapist match. Returns (patient_tokens, therapist_tokens)."""
    p = _register(client, patient_phone).json()
    t = _register(client, therapist_phone, role="therapist").json()
    admin = client.post(
        "/api/v1/auth/login",
        json={"account": "13800000000", "password": "Admin123456"},
    ).json()

    tp = client.put(
        "/api/v1/users/me/therapist-profile",
        headers=_auth(t["access_token"]),
        json={
            "organization": "市康复医院",
            "license_type": "康复治疗师",
            "license_number": "ZC-" + uuid.uuid4().hex[:8],
            "specialties": "骨科康复",
            "bio": "测试",
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
    return p, t, tp, admin


def test_therapist_sees_bound_patient_alerts_and_health(client: TestClient):
    patient_phone = "13" + "".join(
        __import__("random").choices("0123456789", k=9)
    )
    therapist_phone = "15" + "".join(
        __import__("random").choices("0123456789", k=9)
    )
    p, t, tp, _ = _setup_bound_pair(client, patient_phone, therapist_phone)

    # patient reports abnormal blood pressure -> alert generated
    resp = client.post(
        "/api/v1/health/records",
        headers=_auth(p["access_token"]),
        json={"record_type": "blood_pressure", "systolic": 200, "diastolic": 110},
    )
    assert resp.status_code == 201, resp.text

    # therapist aggregated alert list (no patient_id) sees it
    resp = client.get("/api/v1/alerts", headers=_auth(t["access_token"]))
    assert resp.status_code == 200, resp.text
    alerts = resp.json()
    assert len(alerts) == 1
    assert alerts[0]["severity"] == "critical"

    # therapist aggregated health records sees it
    resp = client.get("/api/v1/health/records", headers=_auth(t["access_token"]))
    assert resp.status_code == 200, resp.text
    assert resp.json()["total"] == 1

    # therapist trends endpoint works for bound patient
    resp = client.get(
        "/api/v1/health/trends?record_type=blood_pressure&days=7",
        headers=_auth(t["access_token"]),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["points"]


def test_unbound_therapist_cannot_access_other_patient(client: TestClient):
    patient_phone = "13" + "".join(
        __import__("random").choices("0123456789", k=9)
    )
    therapist_phone = "15" + "".join(
        __import__("random").choices("0123456789", k=9)
    )
    p, t, tp, _ = _setup_bound_pair(client, patient_phone, therapist_phone)

    # a second, unbound patient
    other = _register(client, "17" + "".join(
        __import__("random").choices("0123456789", k=9)
    )).json()
    other_profile = client.put(
        "/api/v1/users/me/patient-profile",
        headers=_auth(other["access_token"]),
        json={"gender": "female", "medical_history": "高血压"},
    )
    assert other_profile.status_code == 200, other_profile.text

    # therapist cannot view unbound patient's profile (data-level RBAC)
    other_id = other_profile.json()["user_id"]
    resp = client.get(
        f"/api/v1/patients/{other_id}",
        headers=_auth(t["access_token"]),
    )
    assert resp.status_code == 403, resp.text

    # therapist cannot query unbound patient's health records
    resp = client.get(
        f"/api/v1/health/records?patient_id={other_id}",
        headers=_auth(t["access_token"]),
    )
    assert resp.status_code == 403, resp.text
