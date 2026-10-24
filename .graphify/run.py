"""Run a pinned, code-only Graphify workflow from any project checkout."""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys
import venv

VERSION = "0.9.61"
ROOT = Path(__file__).resolve().parents[1]
GRAPH = ROOT / "graphify-out" / "graph.json"


def interpreter() -> str:
    override = os.environ.get("GRAPHIFY_PYTHON")
    if override:
        return override
    try:
        if importlib.metadata.version("graphifyy") == VERSION:
            return sys.executable
    except importlib.metadata.PackageNotFoundError:
        pass
    env = ROOT / ".graphify-venv"
    python = env / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    marker = env / ".graphify-version"
    if not python.exists() or not marker.exists() or marker.read_text().strip() != VERSION:
        venv.EnvBuilder(with_pip=False).create(env)
        bootstrap = subprocess.run([str(python), "-m", "ensurepip", "--upgrade"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Embedded Python distributions may ship pip but omit ensurepip.
        pip_command = ([str(python), "-m", "pip"] if bootstrap.returncode == 0
                       else [sys.executable, "-m", "pip", "--python", str(python)])
        subprocess.run([*pip_command, "install", "--disable-pip-version-check",
                        f"graphifyy=={VERSION}"], check=True)
        marker.write_text(VERSION, encoding="utf-8")
    return str(python)


def run(python: str, *args: str) -> None:
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    subprocess.run([python, "-m", "graphify", *args], cwd=ROOT, env=env, check=True)


def refresh(python: str) -> bool:
    run(python, "extract", ".", "--code-only", "--no-cluster", "--max-workers", "2")
    if not GRAPH.exists() or not json.loads(GRAPH.read_text(encoding="utf-8")).get("nodes"):
        print("Nessun simbolo indicizzabile: il progetto e vuoto o contiene solo formati non supportati.")
        return False
    run(python, "cluster-only", ".", "--no-label")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["refresh", "query", "path", "explain", "affected", "god-nodes"])
    args, extra = parser.parse_known_args()
    python = interpreter()
    if args.command == "refresh":
        if extra:
            parser.error("refresh non accetta opzioni: la scansione resta solo codice e locale")
        refresh(python)
        return 0
    if not GRAPH.exists() and not refresh(python):
        return 0
    # Keep navigation commands read-only and fixed to this project's graph.
    if "--graph" in extra or any(x.startswith("--graph=") for x in extra):
        parser.error("il grafo del progetto viene selezionato automaticamente")
    if args.command == "query" and not any(x == "--budget" or x.startswith("--budget=") for x in extra):
        extra += ["--budget", "1500"]
    run(python, args.command, *extra, "--graph", str(GRAPH))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode)
