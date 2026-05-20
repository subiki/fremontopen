import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import ROOT_DIR, _normalize_database_url


def test_normalize_database_url_anchors_relative_sqlite_paths_to_backend():
    url = _normalize_database_url("sqlite+aiosqlite:///./cuestats_dev.db")

    assert url == f"sqlite+aiosqlite:///{(ROOT_DIR / 'cuestats_dev.db').resolve().as_posix()}"


def test_normalize_database_url_preserves_absolute_sqlite_paths(tmp_path):
    db_path = (tmp_path / "test.db").resolve()

    url = _normalize_database_url(f"sqlite+aiosqlite:///{db_path.as_posix()}")

    assert url == f"sqlite+aiosqlite:///{db_path.as_posix()}"
