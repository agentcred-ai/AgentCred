#!/usr/bin/env bash
# CI Integration Test: CLI commands
# Requires: GITHUB_TOKEN
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing @agentcred-ai/cli ==="

# Require GITHUB_TOKEN
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN is required"
  exit 1
fi

cd "$PROJECT_ROOT"

# Run CLI package tests
echo "Running CLI unit tests..."
pnpm --filter @agentcred-ai/cli test

echo ""
echo "=== CLI Smoke Tests ==="

CLI="node $PROJECT_ROOT/packages/cli/dist/index.js"

# Test --help
echo "1. Testing --help..."
$CLI --help | grep -q "agentcred"
echo "   OK"

# Test --version
echo "2. Testing --version..."
VERSION=$($CLI --version 2>&1)
[[ -n "$VERSION" ]]
echo "   Version: $VERSION"
echo "   OK"

# Test verify with invalid JSON (should fail)
echo "3. Testing verify error handling..."
if echo "not-json" | $CLI verify 2>&1; then
  echo "   ERROR: verify should fail with invalid JSON"
  exit 1
fi
echo "   OK (correctly failed)"

echo ""
echo "=== CLI Integration Test ==="

# Create temp directory for test identity
WORKDIR=$(mktemp -d)
export AGENTCRED_HOME="$WORKDIR"
trap "rm -rf $WORKDIR" EXIT

echo "4. Testing init with token..."
$CLI init --token "$GITHUB_TOKEN" --json
echo "   OK"

echo "5. Testing whoami after init..."
WHOAMI=$($CLI whoami --json)
echo "   Identity: $WHOAMI"

# Extract username
USERNAME=$(echo "$WHOAMI" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).username)")
[[ -n "$USERNAME" ]]
echo "   Username: $USERNAME"
echo "   OK"

echo "6. Testing sign..."
ENVELOPE=$(echo "Hello from CLI test!" | $CLI sign --agent cli-test)
echo "   Envelope created (${#ENVELOPE} chars)"

# Verify it's valid JSON
echo "$ENVELOPE" | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'))"
echo "   OK"

echo "7. Testing verify..."
VERIFY_RESULT=$(echo "$ENVELOPE" | $CLI verify --json)
echo "   Result: $VERIFY_RESULT"

# Check verified field
if echo "$VERIFY_RESULT" | grep -q '"verified": *true'; then
  echo "   Verification: PASSED"
else
  echo "   ERROR: Verification failed"
  exit 1
fi
echo "   OK"

echo ""
echo "=== CLI Tests Complete ==="
