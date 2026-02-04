#!/usr/bin/env bash
# CI Integration Test: LangChain MCP integration
# Verifies that LangChain can load AgentCred MCP tools
# NO OpenAI API required - tests MCP integration only
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing LangChain + AgentCred MCP Integration ==="

# Require Python
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

echo "Installing langchain-mcp-adapters..."
pip install -q langchain-mcp-adapters

echo ""
echo "=== LangChain MCP Integration Tests ==="

MCP_SERVER_PATH="$PROJECT_ROOT/packages/mcp-server/dist/index.js"

# Test 1: Import check
echo "1. Testing imports..."
python -c "
from langchain_mcp_adapters.client import MultiServerMCPClient
print('   MultiServerMCPClient imported')
"
echo "   OK"

# Test 2: MCP server connection and tool loading (CORE TEST)
echo "2. Testing MCP server connection and tool loading..."
export HOME="$WORKDIR"
python << PYEOF
import asyncio
import os
from langchain_mcp_adapters.client import MultiServerMCPClient

async def test_connection():
    config = {
        "agentcred": {
            "command": "node",
            "args": ["$MCP_SERVER_PATH"],
            "transport": "stdio",
            "env": {
                "HOME": os.environ.get("HOME", ""),
            }
        }
    }
    
    client = MultiServerMCPClient(config)
    tools = await client.get_tools()
    print(f"   Loaded {len(tools)} tools: {[t.name for t in tools]}")
    
    # Verify all 4 AgentCred tools are present
    tool_names = [t.name for t in tools]
    expected = ['agentcred_init', 'agentcred_sign', 'agentcred_verify', 'agentcred_whoami']
    for name in expected:
        if name not in tool_names:
            raise ValueError(f"Missing expected tool: {name}")
    
    print("   All 4 AgentCred tools loaded correctly")

asyncio.run(test_connection())
PYEOF
echo "   OK"

deactivate

echo ""
echo "=== LangChain Tests Complete ==="
