"""Health check endpoint tests."""


def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["message"] == "ok"
    assert data["data"]["status"] == "healthy"
    assert data["data"]["app_name"] == "RSOD Agent Platform"
    assert "version" in data["data"]


def test_root(client):
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert "docs" in data
