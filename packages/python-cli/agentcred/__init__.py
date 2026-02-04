"""AgentCred — Cryptographic identity for AI agents (Python wrapper)."""

import json

from .client import _run_cli
from .exceptions import AgentCredCLIError, NodeNotFoundError

__all__ = [
    "init",
    "sign",
    "verify",
    "whoami",
    "AgentCredCLIError",
    "NodeNotFoundError",
]


def init(github_token: str) -> dict:
    """Initialize AgentCred identity with GitHub token."""
    return _run_cli("init", "--token", github_token)


def sign(content: str, *, agent: str = "default") -> dict:
    """Sign content and return AgentCred envelope."""
    # sign command already outputs JSON, no --json flag needed
    return _run_cli("sign", "--agent", agent, stdin_data=content, add_json_flag=False)


def verify(envelope: str | dict) -> dict:
    """Verify an AgentCred envelope."""
    data = json.dumps(envelope) if isinstance(envelope, dict) else envelope
    return _run_cli("verify", stdin_data=data)


def whoami() -> dict:
    """Get current AgentCred identity info."""
    return _run_cli("whoami")
