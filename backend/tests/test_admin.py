"""Iteration 3 admin / auth tests.

Covers:
- POST /api/auth/login (success, wrong password, rate-limit)
- GET /api/auth/me, GET /api/admin/me
- GET /api/health
- POST /api/admin/sync (challonge_api_calls field, skip_frozen optimisation)
- Rename / merge players + audit log
- PATCH / DELETE match
- 401 on all admin/* without bearer
"""
import os
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


# ---------- helpers ----------
def _mongo():
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


def _clear_lockouts():
    _mongo().login_attempts.delete_many({})


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(client):
    _clear_lockouts()
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
def test_health(client):
    r = client.get(f"{API}/health", timeout=15)
    assert r.status_code in (200, 503)
    data = r.json() if r.status_code == 200 else r.json().get("detail", {})
    assert "status" in data
    assert "stale" in data
    assert "last_synced_at" in data


# ---------- Login success / failure ----------
def test_login_success(client):
    _clear_lockouts()
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"
    assert isinstance(data["token"], str) and len(data["token"]) > 20


def test_login_wrong_password(client):
    _clear_lockouts()
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "definitely-wrong"})
    assert r.status_code == 401
    assert "detail" in r.json()


def test_login_bad_email_format(client):
    r = client.post(f"{API}/auth/login", json={"email": "not-an-email", "password": "x"})
    # pydantic EmailStr -> 422
    assert r.status_code == 422


# ---------- Brute-force lockout ----------
def test_brute_force_lockout(client):
    _clear_lockouts()
    last_status = None
    for i in range(5):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": f"wrong-{i}"})
        last_status = r.status_code
        assert last_status == 401, f"attempt {i} got {last_status}"
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-6"})
    assert r.status_code == 429, f"expected lockout, got {r.status_code} body={r.text}"
    # cleanup so next tests aren't locked
    _clear_lockouts()


# ---------- /me endpoints ----------
def test_auth_me_with_token(client, auth_headers):
    r = client.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"email": ADMIN_EMAIL, "role": "admin"}


def test_auth_me_without_token(client):
    r = client.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_admin_me_with_token(client, auth_headers):
    r = client.get(f"{API}/admin/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == {"email": ADMIN_EMAIL, "role": "admin"}


def test_admin_me_without_token(client):
    r = client.get(f"{API}/admin/me")
    assert r.status_code == 401


# ---------- All /api/admin/* require bearer ----------
@pytest.mark.parametrize("method,path,body", [
    ("get", "/admin/me", None),
    ("get", "/admin/audit", None),
    ("post", "/admin/sync", {"force": False}),
    ("post", "/admin/players/rename/foo", {"new_name": "bar"}),
    ("post", "/admin/players/merge", {"canonical_name": "a", "alias_names": ["b"]}),
    ("patch", "/admin/matches/x", {"winner_name": "z"}),
    ("delete", "/admin/matches/x", None),
])
def test_admin_routes_require_bearer(client, method, path, body):
    fn = getattr(client, method)
    kwargs = {"timeout": 15}
    if body is not None:
        kwargs["json"] = body
    r = fn(f"{API}{path}", **kwargs)
    assert r.status_code == 401, f"{method.upper()} {path} expected 401 got {r.status_code}"


# ---------- Admin sync (idle should be 1 API call) ----------
def test_admin_sync_idle_skips_frozen(client, auth_headers):
    """Verify skip_frozen optimisation:
    - challonge_api_calls field exists
    - tournaments_skipped_frozen >= 3 (3 of 4 tournaments are state='complete')
    - the lone pending tournament (13219873) will still re-fetch each sync (2 calls)
    """
    r = client.post(f"{API}/admin/sync", json={"force": False}, headers=auth_headers, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "challonge_api_calls" in data, data
    assert data.get("tournaments_skipped_frozen", 0) >= 3, data
    # 1 list + 2 (pending refetch) = 3; if all were frozen it would be 1
    assert data["challonge_api_calls"] <= 3, f"got {data['challonge_api_calls']}"


# ---------- Audit log ----------
def test_audit_log_lists_recent(client, auth_headers):
    r = client.get(f"{API}/admin/audit?limit=10", headers=auth_headers)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    if items:
        assert "action" in items[0] and "at" in items[0]


# ---------- Rename player (round-trip) ----------
def test_rename_player_roundtrip(client, auth_headers):
    original = "Vigo the Carpathian"
    temp = f"TEST_RENAMED_{uuid.uuid4().hex[:6]}"

    # Ensure original exists
    r = client.get(f"{API}/players/{original}")
    if r.status_code == 404:
        pytest.skip(f"{original} not in current dataset")

    # rename
    r = client.post(f"{API}/admin/players/rename/{original}", json={"new_name": temp}, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["to"] == temp
    assert body["matches_updated"] >= 1

    # new exists, old does not
    assert client.get(f"{API}/players/{temp}").status_code == 200
    assert client.get(f"{API}/players/{original}").status_code == 404

    # rename back
    r = client.post(f"{API}/admin/players/rename/{temp}", json={"new_name": original}, headers=auth_headers)
    assert r.status_code == 200
    assert client.get(f"{API}/players/{original}").status_code == 200
    assert client.get(f"{API}/players/{temp}").status_code == 404


# ---------- Merge players (alias -> canonical -> back) ----------
def test_merge_players_roundtrip(client, auth_headers):
    canonical = "Captain Hook"
    alias = "Dr Seuss"
    if client.get(f"{API}/players/{canonical}").status_code != 200:
        pytest.skip("Captain Hook missing")
    if client.get(f"{API}/players/{alias}").status_code != 200:
        pytest.skip("Dr Seuss missing")

    alias_before = client.get(f"{API}/players/{alias}").json()["player"]
    canonical_before = client.get(f"{API}/players/{canonical}").json()["player"]
    expected_matches = (
        alias_before.get("wins", 0) + alias_before.get("losses", 0)
    )

    # merge alias -> canonical
    r = client.post(
        f"{API}/admin/players/merge",
        json={"canonical_name": canonical, "alias_names": [alias]},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["canonical_name"] == canonical
    assert body["matches_updated"] == expected_matches

    # alias no longer present
    assert client.get(f"{API}/players/{alias}").status_code == 404
    merged = client.get(f"{API}/players/{canonical}").json()["player"]
    assert merged["wins"] + merged["losses"] == (
        canonical_before["wins"] + canonical_before["losses"] + expected_matches
    )

    # restore: merge back canonical->alias by renaming would be wrong; we run sync --force in teardown
    # instead, split via a sync force call (since canonical/alias are real Challonge names, sync re-creates both)
    # We don't restore here — restoration handled by main agent via `python sync_job.py --force`.


# ---------- PATCH / DELETE match ----------
def test_patch_and_delete_match(client, auth_headers):
    matches = client.get(f"{API}/matches?limit=1").json()
    if not matches:
        pytest.skip("no matches")
    m = matches[0]
    mid = m["id"]
    original_scores = m.get("scores")

    # PATCH
    r = client.patch(
        f"{API}/admin/matches/{mid}",
        json={"scores": "TEST-9-9"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["scores"] == "TEST-9-9"

    # restore scores
    r = client.patch(
        f"{API}/admin/matches/{mid}",
        json={"scores": original_scores or ""},
        headers=auth_headers,
    )
    assert r.status_code == 200

    # 404 on unknown id
    r = client.patch(
        f"{API}/admin/matches/__bogus__",
        json={"scores": "x"},
        headers=auth_headers,
    )
    assert r.status_code == 404

    # DELETE bogus -> 404 (we don't delete real ones)
    r = client.delete(f"{API}/admin/matches/__bogus__", headers=auth_headers)
    assert r.status_code == 404
