"""T5 QA targeted bug tests: unbind-rejection semantics (admin review_match)."""
import random
import uuid

from fastapi.testclient import TestClient

PASSWORD = "Passw0rd123"


def _phone(prefix: str = "13") -> str:
    return prefix + "".join(random.choices("0123456789", k=9))


def _register(client: TestClient, role: str = "patient", phone: str | None = None):
    return client.post(
        "/api/v1/auth/register",
        json={
            "phone": phone or _phone(),
            "password": PASSWORD,
            "full_name": "测试" + uuid.uuid4().hex[:4],
            "role": role,
        },
    ).json()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _admin(client: TestClient) -> dict:
    return client.post(
        "/api/v1/auth/login",
        json={"account": "13800000000", "password": "Admin123456"},
    ).json()


def _user_id(client: TestClient, token: str) -> str:
    return client.get("/api/v1/users/me", headers=_auth(token)).json()["user"]["id"]


def _bound_pair(client: TestClient):
    p = _register(client)
    t = _register(client, role="therapist", phone=_phone("15"))
    admin = _admin(client)
    p_id = _user_id(client, p["access_token"])

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
    m = client.post(
        "/api/v1/matches/request",
        headers=_auth(p["access_token"]),
        json={"therapist_id": tp["user_id"]},
    ).json()
    client.post(
        f"/api/v1/admin/matches/{m['id']}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": True},
    )
    return p, t, admin, m["id"], p_id


def test_reject_unbind_keeps_binding_approved(client: TestClient):
    """Rejecting an unbind request must keep the binding active (approved), not terminate it."""
    p, t, admin, match_id, p_id = _bound_pair(client)

    # patient requests unbind
    ub = client.post(
        f"/api/v1/matches/{match_id}/unbind",
        headers=_auth(p["access_token"]),
        json={"note": "想换康复师"},
    )
    assert ub.status_code == 200
    assert ub.json()["status"] == "pending_unbind"

    # admin REJECTS the unbind -> relationship should stay approved
    rv = client.post(
        f"/api/v1/admin/matches/{match_id}/review",
        headers=_auth(admin["access_token"]),
        json={"approve": False, "note": "驳回解绑申请"},
    )
    assert rv.status_code == 200, rv.text
    body = rv.json()
    assert body["status"] == "approved", f"expected approved after rejecting unbind, got {body['status']}"

    # therapist should still see the patient's data
    resp = client.get(
        f"/api/v1/health/records?patient_id={p_id}",
        headers=_auth(t["access_token"]),
    )
    assert resp.status_code == 200, resp.text
