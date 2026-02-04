"""Custom exceptions for AgentCred Python wrapper."""


class AgentCredError(Exception):
    """Base exception for AgentCred."""


class NodeNotFoundError(AgentCredError):
    """Raised when Node.js / npx is not found on PATH."""


class AgentCredCLIError(AgentCredError):
    """Raised when the AgentCred CLI returns a non-zero exit code."""
