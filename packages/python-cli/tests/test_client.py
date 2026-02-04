"""Tests for the AgentCred Python CLI wrapper."""

import json
import subprocess
from unittest.mock import patch, MagicMock

import pytest

from agentcred import init, sign, verify, whoami
from agentcred.client import _run_cli
from agentcred.exceptions import AgentCredCLIError, NodeNotFoundError


# -- Helpers --

def _mock_run(stdout: str = "{}", returncode: int = 0, stderr: str = ""):
    """Create a mock subprocess.run result."""
    result = MagicMock()
    result.stdout = stdout
    result.stderr = stderr
    result.returncode = returncode
    return result


# -- Tests --

class TestRunCli:
    """Tests for the internal _run_cli function."""

    @patch("agentcred.client.shutil.which", return_value=None)
    def test_raises_node_not_found(self, _mock_which):
        with pytest.raises(NodeNotFoundError, match="Node.js is required"):
            _run_cli("whoami")

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_raises_cli_error_on_failure(self, mock_run, _mock_which):
        mock_run.return_value = _mock_run(returncode=1, stderr="Error: no identity")
        with pytest.raises(AgentCredCLIError, match="no identity"):
            _run_cli("whoami")

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_raises_on_invalid_json(self, mock_run, _mock_which):
        mock_run.return_value = _mock_run(stdout="not json")
        with pytest.raises(AgentCredCLIError, match="Invalid JSON"):
            _run_cli("whoami")


class TestSign:
    """Tests for the sign() function."""

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_sign_passes_correct_args(self, mock_run, _mock_which):
        envelope = {
            "agentcred": {"v": "1.0", "jws": "abc", "github": "alice", "agent": "bot"},
            "content": "hello",
        }
        mock_run.return_value = _mock_run(stdout=json.dumps(envelope))

        result = sign("hello", agent="bot")

        args = mock_run.call_args
        cmd = args[0][0]
        assert "@agentcred-ai/cli" in cmd
        assert "sign" in cmd
        assert "--agent" in cmd
        assert "bot" in cmd
        # sign should NOT have --json flag
        assert "--json" not in cmd
        assert args[1]["input"] == "hello"
        assert result["agentcred"]["github"] == "alice"

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_sign_returns_envelope(self, mock_run, _mock_which):
        envelope = {
            "agentcred": {"v": "1.0", "jws": "xyz", "github": "bob", "agent": "default"},
            "content": "test content",
        }
        mock_run.return_value = _mock_run(stdout=json.dumps(envelope))

        result = sign("test content")
        assert result["content"] == "test content"
        assert result["agentcred"]["v"] == "1.0"


class TestVerify:
    """Tests for the verify() function."""

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_verify_with_dict_input(self, mock_run, _mock_which):
        verify_result = {"verified": True, "github": {"username": "alice"}}
        mock_run.return_value = _mock_run(stdout=json.dumps(verify_result))

        result = verify({"agentcred": {}, "content": "hello"})

        args = mock_run.call_args
        assert args[1]["input"] is not None  # stdin should have JSON
        assert "--json" in args[0][0]
        assert result["verified"] is True

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_verify_with_string_input(self, mock_run, _mock_which):
        verify_result = {"verified": False, "error": "invalid signature"}
        mock_run.return_value = _mock_run(stdout=json.dumps(verify_result))

        result = verify('{"agentcred": {}, "content": "hello"}')
        assert result["verified"] is False


class TestInit:
    """Tests for the init() function."""

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_init_passes_token(self, mock_run, _mock_which):
        mock_run.return_value = _mock_run(
            stdout=json.dumps({"username": "alice", "fingerprint": "abc123"})
        )

        result = init("ghp_test_token")

        args = mock_run.call_args
        cmd = args[0][0]
        assert "--token" in cmd
        assert "ghp_test_token" in cmd
        assert "--json" in cmd
        assert result["username"] == "alice"


class TestWhoami:
    """Tests for the whoami() function."""

    @patch("agentcred.client.shutil.which", return_value="/usr/bin/npx")
    @patch("agentcred.client.subprocess.run")
    def test_whoami_returns_identity(self, mock_run, _mock_which):
        identity = {"username": "alice", "fingerprint": "abc123"}
        mock_run.return_value = _mock_run(stdout=json.dumps(identity))

        result = whoami()
        assert result["username"] == "alice"
        assert "--json" in mock_run.call_args[0][0]
