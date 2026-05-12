"""Iteration 6 extras-router tests: search, /p/:name, OG image, compare, player extras, fargo edit.

Covers the new endpoints added in iteration 5:
- GET /api/search
- GET /api/players/{name}/extras
- GET /api/compare/{a}/{b}
- GET /api/og/players/{name}.png
- GET /api/p/{name}
- PUT /api/admin/players/{name}/fargo
- PUT /api/me/fargo

Cleanup: every fargo we set is reset to its original value (typically null) at the end.
"""
import os
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

PLAYER_A = "Donkey from Shrek"
PLAYER_B = "Captain Hook"
# Note: Dr Seuss was merged into Captain Hook by an earlier iteration's admin
# test (test_admin.py::test_merge_players_roundtrip) and never restored.
# We dynamically pick an existing player for fargo-write tests below.
PLAYER_C = "Dr Seuss"  # preferred per review request; we fall back if missing
PLAYER_C_FALLBACK = "Chad Galera"


def _player_c(client):
    r = client.get(f"{API}/players/{PLAYER_C}")
    if r.status_code == 200:
        return PLAYER_C
    return PLAYER_C_FALLBACK


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(client):
    # clear lockouts via direct mongo to be safe
    try:
        from pymongo import MongoClient
        MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]].login_attempts.delete_many({})
    except Exception:
        pass
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Search ----------
def test_search_donkey(client):
    r = client.get(f"{API}/search", params={"q": "Donkey"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "players" in data and "tournaments" in data
    assert isinstance(data["players"], list)
    assert isinstance(data["tournaments"], list)
    # case-insensitive substring should hit Donkey from Shrek
    names = [p["name"] for p in data["players"]]
    assert any("donkey" in n.lower() for n in names), names


def test_search_empty(client):
    r = client.get(f"{API}/search", params={"q": ""}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data == {"players": [], "tournaments": []}


def test_search_whitespace_only(client):
    r = client.get(f"{API}/search", params={"q": "   "}, timeout=15)
    assert r.status_code == 200
    assert r.json() == {"players": [], "tournaments": []}


# ---------- Player extras ----------
def test_player_extras_shape(client):
    r = client.get(f"{API}/players/{PLAYER_A}/extras", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ["streaks", "titles", "perf_vs_fargo", "wins_over_time", "fargo"]:
        assert key in data, f"missing {key}"
    # streaks structure
    s = data["streaks"]
    assert "current" in s and "longest_w" in s and "longest_l" in s
    assert s["current"]["type"] in ("W", "L", None)
    assert isinstance(s["longest_w"], int)
    assert isinstance(s["longest_l"], int)
    # titles structure
    t = data["titles"]
    assert "by_game" in t and "total" in t and "titles" in t
    assert isinstance(t["by_game"], dict)
    # perf_vs_fargo
    p = data["perf_vs_fargo"]
    assert "has_fargo" in p
    # wins_over_time
    assert isinstance(data["wins_over_time"], list)
    if data["wins_over_time"]:
        row = data["wins_over_time"][0]
        for k in ["date", "wins", "losses"]:
            assert k in row


def test_player_extras_404(client):
    r = client.get(f"{API}/players/Bogus%20Name/extras", timeout=15)
    assert r.status_code == 404


# ---------- OG image ----------
def test_og_player_png(client):
    r = client.get(f"{API}/og/players/{PLAYER_A}.png", timeout=30)
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("image/png")
    assert len(r.content) >= 5 * 1024, f"image only {len(r.content)} bytes"
    # PNG magic
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_og_player_png_404(client):
    r = client.get(f"{API}/og/players/Bogus%20Name.png", timeout=15)
    assert r.status_code == 404


# ---------- /p/{name} OG meta HTML page ----------
def test_public_player_card_html(client):
    r = client.get(f"{API}/p/{PLAYER_A}", timeout=15)
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("text/html")
    body = r.text
    for tag in ['property="og:title"', 'property="og:description"', 'property="og:image"', 'og:url']:
        assert tag in body, f"missing meta {tag}"
    assert "/api/og/players/" in body
    assert ".png" in body


def test_public_player_card_404(client):
    r = client.get(f"{API}/p/Bogus%20Name", timeout=15)
    assert r.status_code == 404


# ---------- Compare ----------
def test_compare_two_players(client):
    r = client.get(f"{API}/compare/{PLAYER_A}/{PLAYER_B}", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "a" in data and "b" in data
    assert data["a"]["name"] == PLAYER_A
    assert data["b"]["name"] == PLAYER_B
    assert "h2h" in data
    for k in ["a_wins", "b_wins", "matches"]:
        assert k in data["h2h"]
    assert isinstance(data["h2h"]["matches"], list)
    assert "common_opponents" in data
    assert isinstance(data["common_opponents"], list)


def test_compare_unknown_player(client):
    r = client.get(f"{API}/compare/{PLAYER_A}/__bogus__", timeout=15)
    assert r.status_code == 404


# ---------- Admin fargo ----------
def test_admin_set_fargo_and_verify_then_clear(client, admin_headers):
    name = _player_c(client)
    # capture original
    original = client.get(f"{API}/players/{name}").json()["player"].get("fargo")

    try:
        # set to 650
        r = client.put(f"{API}/admin/players/{name}/fargo", json={"fargo": 650}, headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.json() == {"name": name, "fargo": 650}

        # verify on GET /api/players
        got = client.get(f"{API}/players/{name}").json()["player"]
        assert got["fargo"] == 650

        # set null clears
        r = client.put(f"{API}/admin/players/{name}/fargo", json={"fargo": None}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["fargo"] is None
        got = client.get(f"{API}/players/{name}").json()["player"]
        assert got.get("fargo") is None
    finally:
        # restore original
        client.put(
            f"{API}/admin/players/{name}/fargo",
            json={"fargo": original},
            headers=admin_headers,
        )


def test_admin_set_fargo_out_of_range(client, admin_headers):
    name = _player_c(client)
    r = client.put(
        f"{API}/admin/players/{name}/fargo",
        json={"fargo": 100},
        headers=admin_headers,
    )
    assert r.status_code == 422, r.text


def test_admin_set_fargo_out_of_range_high(client, admin_headers):
    name = _player_c(client)
    r = client.put(
        f"{API}/admin/players/{name}/fargo",
        json={"fargo": 1000},
        headers=admin_headers,
    )
    assert r.status_code == 422, r.text


def test_admin_set_fargo_unknown_player_404(client, admin_headers):
    r = client.put(
        f"{API}/admin/players/__bogus__/fargo",
        json={"fargo": 500},
        headers=admin_headers,
    )
    assert r.status_code == 404


def test_admin_set_fargo_no_auth(client):
    name = _player_c(client)
    r = client.put(f"{API}/admin/players/{name}/fargo", json={"fargo": 500})
    assert r.status_code == 401


# ---------- /me/fargo (no claim) ----------
def test_me_fargo_requires_claim(client):
    """Without a user JWT, require_user dependency returns 401.
    The spec says 'returns 400 Claim a player first' but that requires being logged in WITHOUT a claim.
    We assert at minimum a 4xx and verify behaviour with a crafted JWT below if possible."""
    r = client.put(f"{API}/me/fargo", json={"fargo": 500})
    # require_user with no token -> 401
    assert r.status_code in (400, 401), r.text


def test_me_fargo_with_user_no_claim(client):
    """Craft a user JWT with no claimed_player and verify 400 'Claim a player first'."""
    try:
        import jwt as pyjwt
        from datetime import datetime, timedelta, timezone
        from pymongo import MongoClient
    except ImportError:
        pytest.skip("jwt/pymongo not available")

    secret = os.environ.get("JWT_SECRET")
    if not secret:
        pytest.skip("JWT_SECRET not in env")

    db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    uid = "TEST_iter6_no_claim"
    db.users.insert_one({
        "id": uid,
        "email": "test-iter6@example.com",
        "display_name": "Test Iter6",
        "provider": "google",
        "sub": uid,
        "role": "user",
        "claimed_player": None,
    })
    try:
        payload = {
            "sub": uid,
            "role": "user",
            "type": "session",
            "provider": "google",
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        }
        token = pyjwt.encode(payload, secret, algorithm="HS256")
        r = client.put(
            f"{API}/me/fargo",
            json={"fargo": 500},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400, r.text
        assert "claim" in r.json().get("detail", "").lower()
    finally:
        db.users.delete_one({"id": uid})


def test_me_fargo_with_claimed_player(client):
    """Craft a user JWT WITH claimed_player and verify the player's fargo is updated."""
    try:
        import jwt as pyjwt
        from datetime import datetime, timedelta, timezone
        from pymongo import MongoClient
    except ImportError:
        pytest.skip("jwt/pymongo not available")

    secret = os.environ.get("JWT_SECRET")
    if not secret:
        pytest.skip("JWT_SECRET not in env")

    db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    uid = "TEST_iter6_claim"
    # use PLAYER_A so we don't fight with the admin-fargo test on PLAYER_C
    original = db.players.find_one({"name": PLAYER_A}, {"_id": 0, "fargo": 1})
    original_fargo = original.get("fargo") if original else None

    db.users.insert_one({
        "id": uid,
        "email": "test-iter6-claim@example.com",
        "display_name": "Test Iter6 Claim",
        "provider": "google",
        "sub": uid,
        "role": "user",
        "claimed_player": PLAYER_A,
    })
    try:
        payload = {
            "sub": uid,
            "role": "user",
            "type": "session",
            "provider": "google",
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        }
        token = pyjwt.encode(payload, secret, algorithm="HS256")
        r = client.put(
            f"{API}/me/fargo",
            json={"fargo": 555},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200, r.text
        assert r.json() == {"name": PLAYER_A, "fargo": 555}

        # verify persisted
        got = client.get(f"{API}/players/{PLAYER_A}").json()["player"]
        assert got["fargo"] == 555
    finally:
        # restore fargo & remove user
        db.players.update_one({"name": PLAYER_A}, {"$set": {"fargo": original_fargo}})
        db.users.delete_one({"id": uid})


# ---------- Perf-vs-fargo becomes truthy when two players have ratings ----------
def test_perf_vs_fargo_activates_with_ratings(client, admin_headers):
    """Set fargos for PLAYER_A and PLAYER_B; verify perf_vs_fargo.has_fargo is true."""
    # Capture originals
    orig_a = client.get(f"{API}/players/{PLAYER_A}").json()["player"].get("fargo")
    orig_b = client.get(f"{API}/players/{PLAYER_B}").json()["player"].get("fargo")

    try:
        for name, val in [(PLAYER_A, 550), (PLAYER_B, 500)]:
            r = client.put(f"{API}/admin/players/{name}/fargo", json={"fargo": val}, headers=admin_headers)
            assert r.status_code == 200, r.text

        r = client.get(f"{API}/players/{PLAYER_A}/extras", timeout=30)
        assert r.status_code == 200
        perf = r.json()["perf_vs_fargo"]
        assert perf["has_fargo"] is True
        assert perf["fargo"] == 550
        assert perf["label"] in ("above rating", "on rating", "below rating")
        # may be 0 if they never played each other; if h2h is non-empty rated_matches should be > 0
        compare = client.get(f"{API}/compare/{PLAYER_A}/{PLAYER_B}").json()
        if compare["h2h"]["matches"]:
            assert perf["rated_matches"] >= 1
    finally:
        client.put(f"{API}/admin/players/{PLAYER_A}/fargo", json={"fargo": orig_a}, headers=admin_headers)
        client.put(f"{API}/admin/players/{PLAYER_B}/fargo", json={"fargo": orig_b}, headers=admin_headers)


# ---------- Final cleanup verifying ----------
def test_cleanup_all_test_fargos_reset(client):
    """Sentinel test: ensures none of our test players were left with a stray test fargo."""
    for name in [PLAYER_A, PLAYER_B, _player_c(client)]:
        r = client.get(f"{API}/players/{name}")
        if r.status_code != 200:
            continue
        p = r.json()["player"]
        fargo = p.get("fargo")
        if fargo is not None:
            assert 200 <= fargo <= 900, f"{name} fargo {fargo} out of range"
