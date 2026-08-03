"""Health endpoint tests: /healthz."""
from fastapi.testclient import TestClient


def test_healthz_ok(client: TestClient):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "up"
    assert "version" in body


def test_root_redirects_to_docs_info(client: TestClient):
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["docs"] == "/docs"
    assert body["health"] == "/healthz"


def test_openapi_docs_available(client: TestClient):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    spec = resp.json()
    assert spec["info"]["title"]
    paths = spec["paths"]
    # core auth + health routes exposed
    assert "/api/v1/auth/register" in paths
    assert "/api/v1/auth/login" in paths
    assert "/healthz" in paths
