"""Auth flow tests (PRD F1): register / login / me / refresh / logout / RBAC."""
import uuid

from fastapi.testclient import TestClient

PASSWORD = "Passw0rd123"


def _register(client: TestClient, phone: str, role: str = "patient", **extra):
    payload = {
        "phone": phone,
        "password": PASSWORD,
        "full_name": "测试用户" + uuid.uuid4().hex[:4],
        "role": role,
        **extra,
    }
    return client.post("/api/v1/auth/register", json=payload)


def test_register_and_login_roundtrip(client: TestClient, unique_phone: str):
    # register
    resp = _register(client, unique_phone)
    assert resp.status_code == 201, resp.text
    tokens = resp.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens["token_type"] == "bearer"

    # login with phone
    resp = client.post(
        "/api/v1/auth/login",
        json={"account": unique_phone, "password": PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"] and body["refresh_token"]

    # me with access token
    resp = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    me = resp.json()
    assert me["user"]["phone"] == unique_phone
    assert me["user"]["role"] == "patient"
    assert me["patient_profile"] is not None


def test_login_wrong_password(client: TestClient, unique_phone: str):
    _register(client, unique_phone)
    resp = client.post(
        "/api/v1/auth/login",
        json={"account": unique_phone, "password": "WrongPass1"},
    )
    assert resp.status_code == 401


def test_weak_password_rejected(client: TestClient, unique_phone: str):
    resp = _register(client, unique_phone, password="short")
    assert resp.status_code == 422
    resp = _register(client, unique_phone, password="onlyletters")
    assert resp.status_code == 422
    resp = _register(client, unique_phone, password="12345678")
    assert resp.status_code == 422


def test_duplicate_phone_rejected(client: TestClient, unique_phone: str):
    assert _register(client, unique_phone).status_code == 201
    resp = _register(client, unique_phone)
    assert resp.status_code == 409


def test_refresh_and_logout(client: TestClient, unique_phone: str):
    tokens = _register(client, unique_phone).json()

    # refresh rotates tokens
    resp = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert resp.status_code == 200, resp.text
    new_tokens = resp.json()
    assert new_tokens["access_token"] != tokens["access_token"]

    # old refresh token must be revoked after rotation
    resp = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert resp.status_code == 401

    # logout revokes the latest refresh token
    resp = client.post(
        "/api/v1/auth/logout", json={"refresh_token": new_tokens["refresh_token"]}
    )
    assert resp.status_code == 204
    resp = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": new_tokens["refresh_token"]}
    )
    assert resp.status_code == 401


def test_protected_route_requires_token(client: TestClient):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 401


def test_rbac_patient_cannot_access_admin(client: TestClient, unique_phone: str):
    tokens = _register(client, unique_phone).json()
    resp = client.get(
        "/api/v1/admin/statistics",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 403


def test_therapist_register_creates_pending_profile(client: TestClient, unique_phone: str):
    tokens = _register(client, unique_phone, role="therapist").json()
    resp = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    me = resp.json()
    assert me["user"]["role"] == "therapist"
    assert me["therapist_profile"]["status"] == "pending"


def test_change_password(client: TestClient, unique_phone: str):
    tokens = _register(client, unique_phone).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    resp = client.post(
        "/api/v1/users/me/change-password",
        headers=headers,
        json={"old_password": PASSWORD, "new_password": "NewPassw0rd456"},
    )
    assert resp.status_code == 204
    # old password no longer works
    resp = client.post(
        "/api/v1/auth/login",
        json={"account": unique_phone, "password": PASSWORD},
    )
    assert resp.status_code == 401
    resp = client.post(
        "/api/v1/auth/login",
        json={"account": unique_phone, "password": "NewPassw0rd456"},
    )
    assert resp.status_code == 200
