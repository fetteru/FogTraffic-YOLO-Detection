"""Authentication endpoint tests."""


class TestRegister:
    def test_register_success(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "username": "test_register_user",
                "email": "test_register@example.com",
                "password": "123456",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "test_register_user"
        assert data["email"] == "test_register@example.com"
        assert "hashed_password" not in data
        assert "password" not in data

    def test_register_duplicate_username(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "dup_user",
                "email": "dup1@example.com",
                "password": "123456",
            },
        )

        response = client.post(
            "/api/auth/register",
            json={
                "username": "dup_user",
                "email": "dup2@example.com",
                "password": "123456",
            },
        )

        assert response.status_code == 400

    def test_register_short_username(self, client):
        response = client.post(
            "/api/auth/register",
            json={"username": "ab", "email": "short@example.com", "password": "123456"},
        )

        assert response.status_code == 422

    def test_register_short_password(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "username": "short_pwd_user",
                "email": "shortpwd@example.com",
                "password": "123",
            },
        )

        assert response.status_code == 422

    def test_register_missing_fields(self, client):
        response = client.post("/api/auth/register", json={"username": "no_email_user"})

        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "login_user", "email": "login@example.com", "password": "123456"},
        )

        response = client.post(
            "/api/auth/login",
            json={"username": "login_user", "password": "123456"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "login_user"

    def test_login_wrong_password(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "wrong_pwd_user",
                "email": "wrongpwd@example.com",
                "password": "123456",
            },
        )

        response = client.post(
            "/api/auth/login",
            json={"username": "wrong_pwd_user", "password": "wrongpassword"},
        )

        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/auth/login",
            json={"username": "no_such_user_12345", "password": "123456"},
        )

        assert response.status_code == 401


class TestGetCurrentUser:
    def test_get_me_with_valid_token(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "me_user", "email": "me@example.com", "password": "123456"},
        )
        login_response = client.post(
            "/api/auth/login",
            json={"username": "me_user", "password": "123456"},
        )
        token = login_response.json()["access_token"]

        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "me_user"
        assert data["email"] == "me@example.com"

    def test_get_me_without_token(self, client):
        response = client.get("/api/auth/me")

        assert response.status_code == 401

    def test_get_me_with_invalid_token(self, client):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"},
        )

        assert response.status_code == 401
