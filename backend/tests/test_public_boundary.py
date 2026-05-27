from __future__ import annotations

import importlib.util
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "check_public_boundary.py"


def _load_boundary_module():
    spec = importlib.util.spec_from_file_location("check_public_boundary", SCRIPT_PATH)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_candidate_files_include_untracked_non_ignored_files(monkeypatch, tmp_path):
    boundary = _load_boundary_module()
    monkeypatch.setattr(boundary, "ROOT", tmp_path)

    tracked = tmp_path / "docs" / "README.md"
    untracked = tmp_path / "docs" / "ops-console-local.md"
    tracked.parent.mkdir()
    tracked.write_text("tracked", encoding="utf-8")
    untracked.write_text("untracked", encoding="utf-8")

    def fake_git_files(*args):
        if args == ("--others", "--exclude-standard"):
            return [untracked]
        return [tracked]

    monkeypatch.setattr(boundary, "_git_files", fake_git_files)

    candidates = {
        path.relative_to(tmp_path).as_posix()
        for path in boundary._candidate_files(tracked_only=False)
    }

    assert candidates == {"docs/README.md", "docs/ops-console-local.md"}


def test_candidate_files_can_scan_tracked_only(monkeypatch, tmp_path):
    boundary = _load_boundary_module()
    monkeypatch.setattr(boundary, "ROOT", tmp_path)

    tracked = tmp_path / "README.md"
    untracked = tmp_path / "scratch.js"
    tracked.write_text("tracked", encoding="utf-8")
    untracked.write_text("untracked", encoding="utf-8")

    def fake_git_files(*args):
        if args == ("--others", "--exclude-standard"):
            return [untracked]
        return [tracked]

    monkeypatch.setattr(boundary, "_git_files", fake_git_files)

    candidates = {
        path.relative_to(tmp_path).as_posix()
        for path in boundary._candidate_files(tracked_only=True)
    }

    assert candidates == {"README.md"}
