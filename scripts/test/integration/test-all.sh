#!/usr/bin/env bash
# Master script to run all AgentCred integration tests
#
# Usage:
#   ./test-all.sh           # Run all tests
#   ./test-all.sh sdk       # Run only SDK tests
#   ./test-all.sh mastra vercel  # Run specific tests
#
# Environment variables:
#   GITHUB_TOKEN    - Required for CLI, Python tests with identity
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0
SKIPPED=0

run_test() {
  local name="$1"
  local script="$SCRIPT_DIR/test-${name}.sh"
  
  if [[ ! -f "$script" ]]; then
    echo -e "${YELLOW}SKIP${NC}: $name (script not found)"
    ((SKIPPED++))
    return 0
  fi
  
  echo ""
  echo "========================================"
  echo "Running: $name"
  echo "========================================"
  
  if bash "$script"; then
    echo -e "${GREEN}PASS${NC}: $name"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC}: $name"
    ((FAILED++))
  fi
}

# Ensure packages are built
echo "=== AgentCred Integration Test Suite ==="
echo ""
echo "Ensuring packages are built..."
cd "$PROJECT_ROOT"
pnpm build > /dev/null 2>&1 || {
  echo "Warning: Build had issues, continuing anyway..."
}

# Check environment
echo ""
echo "Environment:"
echo "  GITHUB_TOKEN:    ${GITHUB_TOKEN:+set}${GITHUB_TOKEN:-not set}"

# Determine which tests to run
if [[ $# -gt 0 ]]; then
  TESTS=("$@")
else
  # Default: run all tests in order of dependencies
  TESTS=(
    "sdk"        # Core SDK - no external deps
    "mastra"     # Mastra integration - no external deps
    "vercel"     # Vercel AI SDK - no external deps
    "cli"        # CLI - requires GITHUB_TOKEN
    "mcp-server" # MCP server - no external deps
    "python"     # Python CLI - requires GITHUB_TOKEN
    "langchain"  # LangChain MCP adapter - no external deps
    "crewai"     # CrewAI MCP adapter - no external deps
  )
fi

echo ""
echo "Tests to run: ${TESTS[*]}"

# Run tests
for test in "${TESTS[@]}"; do
  run_test "$test"
done

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed${NC}:  $PASSED"
echo -e "${RED}Failed${NC}:  $FAILED"
echo -e "${YELLOW}Skipped${NC}: $SKIPPED"
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
