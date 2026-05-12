"""CueStats backend API tests."""
import os
import time
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
# load frontend .env for REACT_APP_BACKEND_URL
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health & sync ----------
def test_root(client):
    r = client.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_sync_status_has_data(client):
    r = client.get(f"{API}/sync/status", timeout=30)
    assert r.status_code == 200
    data = r.json()
    # initial sync was already triggered per problem statement
    assert data.get("status") in ("ok", "never_synced")
    if data.get("status") == "ok":
        assert "last_synced_at" in data


def test_trigger_sync_removed(client):
    # POST /api/sync was removed in iteration 2 — sync is now CLI-only
    r = client.post(f"{API}/sync", timeout=30)
    assert r.status_code in (404, 405), r.text


# ---------- Stats ----------
def test_stats(client):
    r = client.get(f"{API}/stats", timeout=30)
    assert r.status_code == 200
    data = r.json()
    for key in ["total_tournaments", "total_matches", "total_players", "players", "recent_matches", "last_synced_at"]:
        assert key in data, f"missing {key}"
    assert data["total_tournaments"] > 0
    assert data["total_matches"] > 0
    assert data["total_players"] > 0
    assert isinstance(data["players"], list) and len(data["players"]) > 0
    # sorted by wins desc
    wins = [p.get("wins", 0) for p in data["players"]]
    assert wins == sorted(wins, reverse=True)
    # recent matches
    assert isinstance(data["recent_matches"], list)


# ---------- Tournaments ----------
def test_tournaments_list(client):
    r = client.get(f"{API}/tournaments", timeout=30)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) > 0
    t = items[0]
    for k in ["id", "name", "state", "participants_count"]:
        assert k in t


def test_tournament_detail(client):
    items = client.get(f"{API}/tournaments").json()
    tid = items[0]["id"]
    r = client.get(f"{API}/tournaments/{tid}", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "tournament" in data and "matches" in data
    assert data["tournament"]["id"] == tid
    assert isinstance(data["matches"], list)


def test_tournament_detail_404(client):
    r = client.get(f"{API}/tournaments/99999999")
    assert r.status_code == 404


# ---------- Players ----------
def test_players_list(client):
    r = client.get(f"{API}/players", timeout=30)
    assert r.status_code == 200
    players = r.json()
    assert isinstance(players, list) and len(players) > 0
    p = players[0]
    for k in ["name", "wins", "losses", "win_rate"]:
        assert k in p


def test_players_search(client):
    all_players = client.get(f"{API}/players").json()
    name = all_players[0]["name"]
    q = name[:2]
    r = client.get(f"{API}/players", params={"q": q})
    assert r.status_code == 200
    filtered = r.json()
    assert any(name.lower().startswith(p["name"].lower()[:1]) for p in filtered)
    assert all(q.lower() in p["name"].lower() for p in filtered)


def test_player_detail(client):
    players = client.get(f"{API}/players").json()
    name = players[0]["name"]
    r = client.get(f"{API}/players/{name}", timeout=30)
    assert r.status_code == 200
    data = r.json()
    for k in ["player", "matches", "head_to_head"]:
        assert k in data
    assert data["player"]["name"] == name
    assert isinstance(data["matches"], list)
    assert isinstance(data["head_to_head"], list)


def test_player_detail_404(client):
    r = client.get(f"{API}/players/__nonexistent_player__")
    assert r.status_code == 404


# ---------- Leaderboard ----------
def test_leaderboard(client):
    r = client.get(f"{API}/leaderboard", params={"limit": 10})
    assert r.status_code == 200
    players = r.json()
    assert isinstance(players, list)
    assert len(players) <= 10
    wins = [p.get("wins", 0) for p in players]
    assert wins == sorted(wins, reverse=True)


# ---------- Matches ----------
def test_matches(client):
    r = client.get(f"{API}/matches", timeout=30)
    assert r.status_code == 200
    matches = r.json()
    assert isinstance(matches, list) and len(matches) > 0
    for m in matches[:3]:
        assert m.get("winner_name")


# ---------- Chat ----------
def test_chat_and_history(client):
    sid = f"TEST_{uuid.uuid4()}"
    r = client.post(f"{API}/chat", json={"session_id": sid, "message": "Who has the most wins?"}, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["session_id"] == sid
    assert isinstance(data.get("answer"), str) and len(data["answer"]) > 5
    assert data["user_message"]["role"] == "user"
    assert data["assistant_message"]["role"] == "assistant"

    # history
    h = client.get(f"{API}/chat/history/{sid}", timeout=30)
    assert h.status_code == 200
    msgs = h.json()
    assert len(msgs) >= 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"


def test_chat_empty_message(client):
    r = client.post(f"{API}/chat", json={"session_id": "TEST_empty", "message": "  "})
    assert r.status_code == 400
