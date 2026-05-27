"""Scan tracked public files for private-boundary leaks.

The check is intentionally narrow: it catches private orchestration labels,
model-vendor scaffolding, and secret-shaped values that should not be committed
to the public static site repository.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SKIP_PARTS = {
    ".git",
    ".local",
    ".venv",
    ".tools",
    "node_modules",
    "build",
    "dist",
    "__pycache__",
}
SKIP_PREFIXES = {
    "frontend/public/data/",
}
SKIP_FILES = {
    "scripts/check_public_boundary.py",
}

BLOCK_PATTERNS = {
    "private orchestration codename": re.compile(r"fremontgoogle", re.IGNORECASE),
    "private studio product marker": re.compile(r"Google\s+AI\s+Studio|ai\.studio", re.IGNORECASE),
    "model vendor client dependency": re.compile(r"@google/genai|\bGEMINI(?:_API_KEY)?\b", re.IGNORECASE),
    "known private user marker": re.compile(r"karmicj", re.IGNORECASE),
    "generic API key assignment": re.compile(
        r"(?i)\b(?:api[_-]?key|token|secret|password)\b\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{20,}"
    ),
    "Google API key literal": re.compile(r"AIza[0-9A-Za-z_\-]{20,}"),
}


def _git_files(*args: str) -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", *args],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return [ROOT / line for line in result.stdout.splitlines() if line.strip()]


def _candidate_files(*, tracked_only: bool) -> list[Path]:
    paths = _git_files()
    if not tracked_only:
        paths.extend(_git_files("--others", "--exclude-standard"))

    seen: set[str] = set()
    unique_paths: list[Path] = []
    for path in paths:
        rel = path.relative_to(ROOT).as_posix()
        if rel in seen:
            continue
        seen.add(rel)
        unique_paths.append(path)
    return unique_paths


def _should_skip(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    if rel in SKIP_FILES:
        return True
    if any(part in SKIP_PARTS for part in path.relative_to(ROOT).parts):
        return True
    return any(rel.startswith(prefix) for prefix in SKIP_PREFIXES)


def _scan_file(path: Path) -> list[tuple[int, str, str]]:
    findings: list[tuple[int, str, str]] = []
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return findings
    except OSError as exc:
        return [(0, "read error", str(exc))]

    for line_no, line in enumerate(text.splitlines(), start=1):
        for label, pattern in BLOCK_PATTERNS.items():
            if pattern.search(line):
                findings.append((line_no, label, line.strip()[:180]))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan public tracked files for private-boundary leaks.")
    parser.add_argument(
        "paths",
        nargs="*",
        help="Optional repo-relative files to scan instead of all tracked files.",
    )
    parser.add_argument(
        "--tracked-only",
        action="store_true",
        help="Scan only tracked files. By default, untracked non-ignored files are included.",
    )
    args = parser.parse_args()

    if args.paths:
        paths = [ROOT / path for path in args.paths]
    else:
        paths = _candidate_files(tracked_only=args.tracked_only)

    all_findings: list[tuple[str, int, str, str]] = []
    for path in paths:
        if not path.exists() or path.is_dir() or _should_skip(path):
            continue
        rel = path.relative_to(ROOT).as_posix()
        for line_no, label, snippet in _scan_file(path):
            all_findings.append((rel, line_no, label, snippet))

    if all_findings:
        print("Public-boundary scan failed:")
        for rel, line_no, label, snippet in all_findings:
            print(f"{rel}:{line_no}: {label}: {snippet}")
        return 1

    print("Public-boundary scan passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
