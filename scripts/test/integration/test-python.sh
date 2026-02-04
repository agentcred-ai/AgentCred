#!/usr/bin/env bash
# CI Integration Test: Python CLI wrapper
# Requires: Python 3.10+
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing Python CLI (agentcred) ==="

PYTHON=${PYTHON:-python3}
if ! command -v $PYTHON &> /dev/null; then
  echo "ERROR: Python not found"
  exit 1
fi

if ! $PYTHON -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"; then
  echo "ERROR: Python 3.10+ required"
  exit 1
fi

PYTHON_VERSION=$($PYTHON -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Python version: $PYTHON_VERSION"

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
echo "=== Python Integration Test (Offline) ==="

export HOME="$WORKDIR"
export AGENTCRED_HOME="$WORKDIR/.agentcred"
mkdir -p "$AGENTCRED_HOME/keys"

echo "3. Generating local keypair and test envelope (no API)..."

(cd "$PROJECT_ROOT/packages/sdk" && node << 'EOF'
import { generateKeyPair, exportJWK, importJWK } from 'jose';
import { sign } from './dist/index.js';
import { writeFileSync } from 'fs';

const keyPair = await generateKeyPair('EdDSA', { extractable: true });
const privateJWK = await exportJWK(keyPair.privateKey);
const publicJWK = await exportJWK(keyPair.publicKey);

writeFileSync(process.env.AGENTCRED_HOME + '/keys/test-user.jwk', JSON.stringify(privateJWK));
writeFileSync(process.env.AGENTCRED_HOME + '/public.jwk', JSON.stringify(publicJWK));

const privateKey = await importJWK(privateJWK, 'EdDSA');
const envelope = await sign('Hello from Python test!', { 
  privateKey, 
  github: 'test-user' 
}, { agent: 'python-test' });

console.log(JSON.stringify(envelope));
EOF
) > "$WORKDIR/envelope.json"

echo "   Keypair and envelope created"
echo "   OK"

echo "4. Testing verify (offline)..."
CLI="node $PROJECT_ROOT/packages/cli/dist/index.js"
ENVELOPE=$(cat "$WORKDIR/envelope.json")
VERIFY_RESULT=$(echo "$ENVELOPE" | $CLI verify --offline --key "$AGENTCRED_HOME/public.jwk" --json)

if echo "$VERIFY_RESULT" | grep -q '"verified": *true'; then
  echo "   Verification: PASSED"
else
  echo "   ERROR: Verification failed"
  exit 1
fi
echo "   OK"

deactivate

echo ""
echo "=== Python Tests Complete ==="
