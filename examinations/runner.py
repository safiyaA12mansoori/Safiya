import os
import resource
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def _limits():
    resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
    try:
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    except (ValueError, OSError):
        pass
    resource.setrlimit(resource.RLIMIT_FSIZE, (1_048_576, 1_048_576))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
    os.setsid()


def _normalize(text):
    lines = (text or "").replace("\r\n", "\n").strip().split("\n")
    return "\n".join(line.rstrip() for line in lines)


def _run_python(code, stdin_text):
    with tempfile.TemporaryDirectory(prefix="erp-code-") as folder:
        script = Path(folder) / "main.py"
        script.write_text(code, encoding="utf-8")
        env = {
            "PATH": "/usr/bin:/bin",
            "PYTHONSAFEPATH": "1",
            "PYTHONDONTWRITEBYTECODE": "1",
            "LANG": "C.UTF-8",
        }
        cmd = [sys.executable, "-I", str(script)]
        isolated = False
        if shutil.which("unshare"):
            probe = subprocess.run(["unshare", "--net", "true"], capture_output=True, timeout=3)
            if probe.returncode == 0:
                cmd = ["unshare", "--net", sys.executable, "-I", str(script)]
                isolated = True
        try:
            proc = subprocess.run(
                cmd,
                input=(stdin_text or "").encode(),
                capture_output=True,
                timeout=3,
                cwd=folder,
                env=env,
                preexec_fn=_limits,
                check=False,
            )
            return {
                "ok": proc.returncode == 0,
                "stdout": proc.stdout.decode(errors="replace"),
                "stderr": proc.stderr.decode(errors="replace"),
                "timed_out": False,
                "isolated": isolated,
            }
        except subprocess.TimeoutExpired as exc:
            out = exc.stdout or b""
            return {
                "ok": False,
                "stdout": out.decode(errors="replace") if isinstance(out, bytes) else str(out),
                "stderr": "Timed out after 3 seconds.",
                "timed_out": True,
                "isolated": isolated,
            }


def evaluate(language, code, cases):
    """Run student code in a separate process. Python only; other languages are stored, not executed."""
    max_score = sum(float(case["marks"]) for case in cases)
    language = (language or "").lower()
    if language not in {"python", "python3"}:
        return {
            "status": "demo",
            "score": 0,
            "max_score": max_score,
            "network_isolated": False,
            "executed": False,
            "message": (
                "This sandbox executes Python in a separate subprocess with a timeout and a memory limit. "
                "Other languages are saved and are not run."
            ),
            "cases": [],
        }
    if "\x00" in code or len(code) > 20000:
        return {
            "status": "error",
            "score": 0,
            "max_score": max_score,
            "network_isolated": False,
            "executed": False,
            "message": "The submission is empty, too long, or not valid text.",
            "cases": [],
        }
    results = []
    score = 0
    isolated = False
    for case in cases:
        outcome = _run_python(code, case.get("stdin") or "")
        isolated = outcome["isolated"]
        passed = outcome["ok"] and _normalize(outcome["stdout"]) == _normalize(case.get("expected") or "")
        if passed:
            score += float(case["marks"])
        results.append(
            {
                "ok": passed,
                "expected": case.get("expected") or "",
                "stdout": (outcome["stdout"] or "")[:2000],
                "stderr": (outcome["stderr"] or "")[:2000],
                "timed_out": outcome["timed_out"],
                "sample": bool(case.get("sample")),
            }
        )
    if any(item["timed_out"] for item in results):
        status = "error"
    elif results and all(item["ok"] for item in results):
        status = "passed"
    else:
        status = "failed"
    return {
        "status": status,
        "score": score,
        "max_score": max_score,
        "network_isolated": isolated,
        "executed": True,
        "message": "Ran in a separate Python process with a 3 second timeout and a memory limit.",
        "cases": results,
    }
