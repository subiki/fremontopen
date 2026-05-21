from pathlib import Path


WORKFLOWS_DIR = Path(__file__).resolve().parents[2] / ".github" / "workflows"


def test_workflows_use_node24_ready_action_majors():
    expected_refs = {
        "actions/checkout@v6",
        "actions/setup-node@v6",
        "actions/setup-python@v6",
        "github/codeql-action/upload-sarif@v4",
    }
    forbidden_refs = {
        "actions/checkout@v4",
        "actions/setup-node@v4",
        "actions/setup-python@v5",
        "github/codeql-action/upload-sarif@v3",
    }

    workflow_text = "\n".join(
        path.read_text(encoding="utf-8") for path in WORKFLOWS_DIR.glob("*.yml")
    )

    for action_ref in expected_refs:
        assert action_ref in workflow_text

    for action_ref in forbidden_refs:
        assert action_ref not in workflow_text
