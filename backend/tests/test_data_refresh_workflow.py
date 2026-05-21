from pathlib import Path


WORKFLOW_PATH = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "data-refresh.yml"


def test_scheduled_refresh_tracks_split_static_bundles():
    workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    assert "frontend/public/data/cache.json" in workflow
    assert "frontend/public/data/data-size-report.json" in workflow
    assert "frontend/public/data/refresh-change-report.json" in workflow
    assert "frontend/public/data/refresh-summary.md" in workflow
    assert "frontend/public/data/version.json" in workflow
    assert "frontend/public/data/h2h-heatmap.json" in workflow
    assert "frontend/public/data/players-index.json" in workflow
    assert "frontend/public/data/recent-matches.json" in workflow
    assert "frontend/public/data/rivalry-index.json" in workflow
    assert "frontend/public/data/single-tournament-overperformers.json" in workflow
    assert "frontend/public/data/tournament-duration-groups.json" in workflow
    assert "frontend/public/data/players" in workflow
    assert "frontend/public/data/season-standings.json" in workflow
    assert "frontend/public/data/tournaments-index.json" in workflow
    assert "frontend/public/data/tournaments" in workflow
    assert "python ../scripts/check_static_data_budget.py" in workflow
    assert 'cat frontend/public/data/refresh-summary.md >> "$GITHUB_STEP_SUMMARY"' in workflow
