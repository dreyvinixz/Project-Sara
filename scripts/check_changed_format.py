"""Run format checks only for files changed from the branch base.

The existing Sprint 1 CSS/layout is intentionally not reformatted by this task.
Files newly touched in a PR must nevertheless follow Biome/Ruff formatting.
"""

import argparse
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".css"}


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def changed_paths() -> list[str]:
    base = os.environ.get("CI_BASE_SHA", "").strip()
    if not base or set(base) == {"0"}:
        try:
            base = git("rev-parse", "HEAD^")
        except subprocess.CalledProcessError:
            print("No parent commit available: skipping changed-file format scan.")
            return []

    # Use the merge base so a feature branch can move with main safely.
    ancestor = git("merge-base", base, "HEAD")
    output = subprocess.check_output(
        ["git", "diff", "--name-only", "-z", ancestor, "HEAD"], cwd=ROOT
    )
    return [value.decode("utf-8") for value in output.split(b"\x00") if value]


def check_format(language: str) -> int:
    candidates = changed_paths()
    if language == "web":
        files = [
            file
            for file in candidates
            if (file.startswith("apps/web/") or file.startswith("packages/contracts/"))
            and Path(file).suffix in WEB_EXTENSIONS
            and (ROOT / file).is_file()
        ]
        biome_cli = subprocess.check_output(
            [
                "node",
                "-p",
                "require.resolve('@biomejs/biome/bin/biome')",
            ],
            cwd=ROOT,
            text=True,
        ).strip()
        command = ["node", biome_cli, "format"]
    else:
        files = [
            file
            for file in candidates
            if (file.startswith("apps/api/") or file.startswith("scripts/"))
            and file.endswith(".py")
            and (ROOT / file).is_file()
        ]
        command = ["ruff", "format", "--check"]

    if not files:
        print(f"No changed {language} files requiring format validation.")
        return 0

    print(f"Checking {language} formatting: {', '.join(files)}", flush=True)
    return subprocess.call([*command, *files], cwd=ROOT)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("language", choices=["web", "python"])
    args = parser.parse_args()
    raise SystemExit(check_format(args.language))
