#!/usr/bin/env bash
# Test MCP server tools
# Runs MCP server package tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing @agentcred-ai/mcp-server ==="

cd "$PROJECT_ROOT"

# Run MCP server package tests
echo "Running MCP server unit tests..."
pnpm --filter @agentcred-ai/mcp-server test

echo ""
echo "=== MCP Server Smoke Tests ==="

MCP_SERVER="node $PROJECT_ROOT/packages/mcp-server/dist/index.js"

# Test that server starts (we can't fully test stdin/stdout MCP without a client)
echo "1. Testing MCP server binary exists..."
if [[ -f "$PROJECT_ROOT/packages/mcp-server/dist/index.js" ]]; then
  echo "   OK"
else
  echo "   FAILED: dist/index.js not found"
  exit 1
fi

# Test that it can be imported
echo "2. Testing MCP server can be imported..."
node -e "
const { createServer, registerTools, registerResources } = require('$PROJECT_ROOT/packages/mcp-server/dist/index.cjs');
if (typeof createServer !== 'function') throw new Error('createServer not exported');
if (typeof registerTools !== 'function') throw new Error('registerTools not exported');
if (typeof registerResources !== 'function') throw new Error('registerResources not exported');
console.log('   All exports available');
"
echo "   OK"

# Test server creation
echo "3. Testing server creation..."
node -e "
const { createServer } = require('$PROJECT_ROOT/packages/mcp-server/dist/index.cjs');
const server = createServer();
console.log('   Server created:', server.constructor.name);
"
echo "   OK"

echo ""
echo "=== MCP Server Tests Complete ==="
