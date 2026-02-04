"""Subprocess wrapper for the AgentCred CLI."""

import json
import shutil
import subprocess

from .exceptions import AgentCredCLIError, NodeNotFoundError


def _run_cli(
    *args: str,
    stdin_data: str | None = None,
    add_json_flag: bool = True,
) -> dict:
    """Run agentcred CLI via npx and return parsed JSON output.

    Args:
        *args: CLI arguments (e.g. "sign", "--agent", "bot").
        stdin_data: Optional data to pipe to stdin.
        add_json_flag: Whether to append --json flag (sign already outputs JSON).

    Returns:
        Parsed JSON output as a dict.

    Raises:
        NodeNotFoundError: If npx is not found on PATH.
        AgentCredCLIError: If the CLI exits with a non-zero code.
    """
    npx = shutil.which("npx")
    if not npx:
        raise NodeNotFoundError(
            "Node.js is required. Install from https://nodejs.org (v18+)"
        )

    cmd = [npx, "-y", "@agentcred-ai/cli", *args]
    if add_json_flag:
        cmd.append("--json")

    result = subprocess.run(
        cmd,
        input=stdin_data,
        capture_output=True,
        text=True,
        timeout=30,
    )

    if result.returncode != 0:
        raise AgentCredCLIError(result.stderr.strip() or result.stdout.strip())

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AgentCredCLIError(f"Invalid JSON from CLI: {result.stdout[:200]}") from exc
