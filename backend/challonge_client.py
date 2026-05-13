"""Challonge v1 API client for fetching tournaments, matches, and participants."""
import os
import requests
from typing import List, Dict, Any, Optional

CHALLONGE_BASE = "https://api.challonge.com/v1"


class ChallongeClient:
    def __init__(self, api_key: Optional[str] = None, subdomain: Optional[str] = None):
        self.api_key = api_key or os.environ.get("CHALLONGE_API_KEY")
        self.subdomain = subdomain if subdomain is not None else os.environ.get("CHALLONGE_SUBDOMAIN")
        if not self.api_key:
            raise ValueError("CHALLONGE_API_KEY not set")

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        params = params or {}
        params["api_key"] = self.api_key
        if self.subdomain:
            params["subdomain"] = self.subdomain
        headers = {
            "User-Agent": "CueStats/1.0 (+https://cuestats.app)",
            "Accept": "application/json",
        }
        resp = requests.get(
            f"{CHALLONGE_BASE}{path}", params=params, headers=headers, timeout=30
        )
        resp.raise_for_status()
        return resp.json()

    def list_tournaments(self, state: str = "all") -> List[Dict[str, Any]]:
        # state options: all, pending, in_progress, ended
        data = self._get("/tournaments.json", {"state": state})
        return [t["tournament"] for t in data]

    def get_tournament(self, tournament_id: str | int) -> Dict[str, Any]:
        data = self._get(f"/tournaments/{tournament_id}.json")
        return data["tournament"]

    def list_matches(self, tournament_id: int) -> List[Dict[str, Any]]:
        data = self._get(f"/tournaments/{tournament_id}/matches.json")
        return [m["match"] for m in data]

    def list_participants(self, tournament_id: int) -> List[Dict[str, Any]]:
        data = self._get(f"/tournaments/{tournament_id}/participants.json")
        return [p["participant"] for p in data]
