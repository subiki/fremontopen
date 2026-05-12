"""User SSO + privacy tests (Iteration 4)."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import jwt
import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
JWT_SECRET = os.environ["JWT_SECRET"]
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def db():
    mc = MongoClient(MONGO_URL)
    # clear any lockouts so admin login works
    mc[DB_NAME].login_attempts.delete_many({})
    yield mc[DB_NAME]
    mc.close()


@pytest.fixture(scope="module")
def admin_token(client, db):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _mk_user_token(user_id: str, provider="discord") -> str:
    payload = {
        "sub": user_id,
        "role": "user",
        "type": "session",
        "provider": provider,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


# ---------- Provider not configured ----------
@pytest.mark.parametrize("prov", ["google", "discord", "facebook"])
def test_oauth_start_unconfigured(client, prov):
    r = client.get(f"{API}/auth/{prov}/start")
    assert r.status_code == 400
    assert "not configured" in r.json().get("detail", "").lower()


@pytest.mark.parametrize("prov", ["google", "discord", "facebook"])
def test_oauth_callback_unconfigured(client, prov):
    r = client.post(f"{API}/auth/{prov}/callback", params={"code": "dummy"})
    assert r.status_code == 400
    assert "not configured" in r.json().get("detail", "").lower()


def test_oauth_unknown_provider(client):
    r = client.get(f"{API}/auth/myspace/start")
    assert r.status_code == 400


# ---------- /me without/with bearer ----------
def test_me_without_bearer(client):
    r = client.get(f"{API}/me")
    assert r.status_code == 401


def test_me_bad_token(client):
    r = client.get(f"{API}/me", headers={"Authorization": "Bearer abc.def.ghi"})
    assert r.status_code == 401


def test_me_admin_token_rejected(client, admin_token):
    """Admin tokens have role=admin/type=access — must NOT pass user auth."""
    r = client.get(f"{API}/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 401


def test_me_user_token_no_db_user(client):
    """Valid user JWT but no user doc → 404."""
    tok = _mk_user_token("does-not-exist-" + uuid.uuid4().hex)
    r = client.get(f"{API}/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 404


def test_admin_me_user_token_rejected(client):
    """User tokens must NOT access /api/admin/me or /api/auth/me."""
    tok = _mk_user_token("any-user")
    r = client.get(f"{API}/admin/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 401
    r2 = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r2.status_code == 401


# ---------- Privacy: claim-info ----------
def test_claim_info_anonymous_returns_only_claimed_flag(client, db):
    players = client.get(f"{API}/players").json()
    name = players[0]["name"]
    r = client.get(f"{API}/players/{name}/claim-info")
    assert r.status_code == 200
    data = r.json()
    assert set(data.keys()) == {"claimed"}
    assert isinstance(data["claimed"], bool)


def test_claim_info_never_leaks_identity(client, db):
    """Insert a real claimed user; verify claim-info still only returns {claimed:true}."""
    players = client.get(f"{API}/players").json()
    name = players[0]["name"]
    uid = "TEST_user_" + uuid.uuid4().hex
    db.users.insert_one({
        "id": uid, "provider": "discord", "provider_user_id": "999",
        "display_name": "Sneaky McLeak", "email": "leak@example.com",
        "avatar_url": "http://a.test/x.png", "claimed_player": name,
        "followed_players": [], "created_at": datetime.now(timezone.utc).isoformat(),
    })
    try:
        r = client.get(f"{API}/players/{name}/claim-info")
        assert r.status_code == 200
        body = r.text
        for forbidden in ["display_name", "email", "provider", "user_id", "avatar", "Sneaky", "leak@example.com"]:
            assert forbidden not in body, f"PRIVACY LEAK: {forbidden} in claim-info"
        assert r.json() == {"claimed": True}
    finally:
        db.users.delete_one({"id": uid})


# ---------- Full user flow with crafted token ----------
def test_user_full_flow_claim_and_follow(client, db):
    """Insert a user doc, craft a token, exercise /me, /me/claim, /me/follow."""
    uid = "TEST_user_" + uuid.uuid4().hex
    db.users.insert_one({
        "id": uid, "provider": "discord", "provider_user_id": "TEST_" + uid,
        "display_name": "Test Player", "email": None, "avatar_url": None,
        "claimed_player": None, "followed_players": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    try:
        tok = _mk_user_token(uid)
        hdr = {"Authorization": f"Bearer {tok}"}

        # /me
        me = client.get(f"{API}/me", headers=hdr)
        assert me.status_code == 200
        body = me.json()
        assert body["id"] == uid
        assert body["display_name"] == "Test Player"
        assert body["claimed_player"] is None

        # claim — use a real player name
        players = client.get(f"{API}/players").json()
        pname = players[0]["name"]
        r = client.post(f"{API}/me/claim", json={"player_name": pname}, headers=hdr)
        assert r.status_code == 200, r.text
        assert r.json()["claimed_player"] == pname

        # claim-info should now return claimed: true
        ci = client.get(f"{API}/players/{pname}/claim-info").json()
        assert ci["claimed"] is True

        # follow
        f = client.post(f"{API}/me/follow", json={"player_name": pname}, headers=hdr)
        assert f.status_code == 200
        assert pname in f.json()["followed_players"]

        # unfollow
        uf = client.delete(f"{API}/me/follow/{pname}", headers=hdr)
        assert uf.status_code == 200
        assert pname not in uf.json()["followed_players"]

        # claim nonexistent player → 404
        r = client.post(f"{API}/me/claim", json={"player_name": "__nope__"}, headers=hdr)
        assert r.status_code == 404

        # unclaim
        u = client.delete(f"{API}/me/claim", headers=hdr)
        assert u.status_code == 200
        assert u.json()["claimed_player"] is None
    finally:
        db.users.delete_one({"id": uid})


def test_claim_conflict_when_already_claimed(client, db):
    """Two users cannot claim the same player."""
    players = client.get(f"{API}/players").json()
    pname = players[1]["name"]
    u1 = "TEST_user_" + uuid.uuid4().hex
    u2 = "TEST_user_" + uuid.uuid4().hex
    for uid in (u1, u2):
        db.users.insert_one({
            "id": uid, "provider": "discord", "provider_user_id": "TEST_" + uid,
            "display_name": uid, "claimed_player": None, "followed_players": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    try:
        t1 = _mk_user_token(u1)
        t2 = _mk_user_token(u2)
        r1 = client.post(f"{API}/me/claim", json={"player_name": pname},
                         headers={"Authorization": f"Bearer {t1}"})
        assert r1.status_code == 200
        r2 = client.post(f"{API}/me/claim", json={"player_name": pname},
                         headers={"Authorization": f"Bearer {t2}"})
        assert r2.status_code == 409
    finally:
        db.users.delete_many({"id": {"$in": [u1, u2]}})


# ---------- Admin auth still works in parallel ----------
def test_admin_auth_still_works(client, admin_token):
    r = client.get(f"{API}/admin/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    r2 = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r2.status_code == 200


def test_public_reads_unchanged(client):
    for ep in ["/stats", "/tournaments", "/players", "/leaderboard", "/health"]:
        r = client.get(f"{API}{ep}", timeout=30)
        assert r.status_code == 200, f"{ep} → {r.status_code}"
