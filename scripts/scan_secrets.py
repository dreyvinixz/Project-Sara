"""Lightweight tracked-file credential guard (not a replacement for secret rotation).

Only reads repository files; never prints token values. Use a dedicated secret
scanner for production. Synthetic signatures are checked by --self-test.
"""

import argparse
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES = {
    "private_key": re.compile(
        rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"
    ),
    "github_token": re.compile(rb"gh[pousr]_[A-Za-z0-9]{36,}"),
    "aws_access_key": re.compile(rb"(?:AKIA|ASIA)[A-Z0-9]{16}"),
    "openai_project_key": re.compile(rb"sk-proj-[A-Za-z0-9_-]{20,}"),
    "google_api_key": re.compile(rb"AIza[A-Za-z0-9_-]{35}"),
}


def findings(data: bytes) -> list[str]:
    return [name for name, regex in RULES.items() if regex.search(data)]


def self_test() -> None:
    synthetic = [
        ("gh" + "p_" + "A" * 36).encode(),
        ("AK" + "IA" + "B" * 16).encode(),
        ("sk" + "-proj-" + "C" * 32).encode(),
        ("-----BEGIN RSA " + "PRIVATE KEY-----").encode(),
    ]
    for item in synthetic:
        if not findings(item):
            raise AssertionError("Credential guard missed a synthetic sample")
    if findings(b"VITE_API_BASE_URL=http://127.0.0.1:8000"):
        raise AssertionError("Local nonsecret configuration was flagged")
    print("Credential guard self-test passed.")


def tracked_paths() -> list[str]:
    output = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [
        item.decode("utf-8")
        for item in output.split(b"\x00")
        if item
    ]


def scan() -> int:
    errors = []
    for relative in tracked_paths():
        path = ROOT / relative
        if not path.is_file():
            continue
        name = path.name
        if name == ".env" or (
            name.startswith(".env.") and name != ".env.example"
        ):
            errors.append(f"{relative}: committed environment file")
            continue
        if path.stat().st_size > 5_000_000:
            print(f"Skipped oversized file: {relative}")
            continue
        data = path.read_bytes()
        if b"\x00" in data:
            continue
        for rule in findings(data):
            errors.append(f"{relative}: possible {rule}")

    if errors:
        print("Credential check failed (values intentionally omitted):")
        for error in errors:
            print(f"- {error}")
        return 1
    print("No known credential signatures detected in tracked files.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        raise SystemExit(scan())
