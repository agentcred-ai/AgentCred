#!/usr/bin/env bash
# CI Integration Test: Python CLI wrapper
# Requires: Python 3.10+, GITHUB_TOKEN
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing Python CLI (agentcred) ==="

# Require Python
PYTHON=${PYTHON:-python3}
if ! command -v $PYTHON &> /dev/null; then
  echo "ERROR: Python not found"
  exit 1
fi

# Require Python 3.10+
if ! $PYTHON -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"; then
  echo "ERROR: Python 3.10+ required"
  exit 1
fi

PYTHON_VERSION=$($PYTHON -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Python version: $PYTHON_VERSION"

# Require GITHUB_TOKEN
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN is required"
  exit 1
fi

cd "$PROJECT_ROOT"

# Create temp virtualenv
WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT

echo ""
echo "=== Setting up Python environment ==="

cd "$WORKDIR"
$PYTHON -m venv .venv
source .venv/bin/activate

# Install local Python package
echo "Installing agentcred Python package..."
pip install -q -e "$PROJECT_ROOT/packages/python-cli"

echo ""
echo "=== Python Package Tests ==="

echo "1. Testing import..."
python -c "from agentcred import init, sign, verify, whoami; print('   All functions imported')"
echo "   OK"

echo "2. Testing exceptions..."
python -c "from agentcred import AgentCredCLIError, NodeNotFoundError; print('   Exception classes imported')"
echo "   OK"

echo ""
echo "=== Python Integration Test ==="

# Set up temp home for agentcred
export HOME="$WORKDIR"
mkdir -p "$WORKDIR/.agentcred"

echo "3. Testing init..."
python << 'PYEOF'
import os
from agentcred import init

result = init(os.environ['GITHUB_TOKEN'])
print(f"   Initialized: {result.get('username', 'unknown')}")
PYEOF
echo "   OK"

echo "4. Testing whoami..."
python << 'PYEOF'
from agentcred import whoami

result = whoami()
username = result.get('username')
if not username:
    raise ValueError("No username returned")
print(f"   Username: {username}")
PYEOF
echo "   OK"

echo "5. Testing sign..."
python << 'PYEOF'
from agentcred import sign

envelope = sign("Hello from Python test!", agent="python-test")
if 'agentcred' not in envelope:
    raise ValueError("Invalid envelope")
print(f"   Signed! GitHub: {envelope['agentcred']['github']}")
print(f"   Agent: {envelope['agentcred']['agent']}")
print(f"   JWS: {envelope['agentcred']['jws'][:50]}...")
PYEOF
echo "   OK"

echo "6. Testing verify..."
python << 'PYEOF'
from agentcred import sign, verify

envelope = sign("Test message for verification", agent="verify-test")
result = verify(envelope)
if not result.get('verified'):
    raise ValueError(f"Verification failed: {result}")
print(f"   Verified: {result.get('verified')}")
print(f"   By: {result['github']['username']}")
PYEOF
echo "   OK"

deactivate

echo ""
echo "=== Python Tests Complete ==="
