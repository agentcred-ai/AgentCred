#!/usr/bin/env bash
# CI Integration Test: CrewAI MCP integration
# Verifies that CrewAI can load AgentCred MCP tools
# NO OpenAI API required - tests MCP integration only
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing CrewAI + AgentCred MCP Integration ==="

PYTHON=${PYTHON:-python3}
if ! command -v $PYTHON &> /dev/null; then
  echo "ERROR: Python not found"
  exit 1
fi

if ! $PYTHON -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"; then
  echo "ERROR: Python 3.10+ required"
  exit 1
fi

cd "$PROJECT_ROOT"

WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT

echo ""
echo "=== Setting up Python environment ==="

cd "$WORKDIR"
$PYTHON -m venv .venv
source .venv/bin/activate

echo "Installing crewai-tools[mcp]..."
pip install -q "crewai-tools[mcp]" mcp

echo ""
echo "=== CrewAI MCP Integration Tests ==="

MCP_SERVER_PATH="$PROJECT_ROOT/packages/mcp-server/dist/index.js"

echo "1. Testing imports..."
python -c "
from crewai_tools import MCPServerAdapter
print('   MCPServerAdapter imported')
"
echo "   OK"

echo "2. Testing MCP adapter tool loading (CORE TEST)..."
export HOME="$WORKDIR"
python << PYEOF
import os
import inspect
import click
click.confirm = lambda *args, **kwargs: True

from crewai_tools import MCPServerAdapter

sig = inspect.signature(MCPServerAdapter.__init__)
params = list(sig.parameters.keys())

if 'serverparams' in params or 'server_params' in params:
    from mcp import StdioServerParameters
    server_params = StdioServerParameters(
        command="node",
        args=["$MCP_SERVER_PATH"],
        env={"HOME": os.environ.get("HOME", "")}
    )
    adapter = MCPServerAdapter(server_params, "agentcred_whoami")
elif 'command' in params:
    adapter = MCPServerAdapter(
        command="node",
        args=["$MCP_SERVER_PATH"],
    )
else:
    raise ValueError(f"Unknown MCPServerAdapter API: {params}")

print("   MCPServerAdapter created successfully")

if hasattr(adapter, 'get_tools'):
    tools = adapter.get_tools()
elif hasattr(adapter, 'tools'):
    tools = adapter.tools
else:
    raise ValueError("Could not find tools accessor")

print(f"   Loaded {len(tools)} tool(s)")
print("   CrewAI can load AgentCred MCP tools")
PYEOF
echo "   OK"

deactivate

echo ""
echo "=== CrewAI Tests Complete ==="
