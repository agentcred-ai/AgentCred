#!/usr/bin/env bash
# CI Integration Test: CLI commands
# Optional: GITHUB_TOKEN (for API integration test)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing @agentcred-ai/cli ==="

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
echo "=== CLI Integration Test (Offline) ==="

WORKDIR=$(mktemp -d)
export AGENTCRED_HOME="$WORKDIR"
trap "rm -rf $WORKDIR" EXIT

echo "4. Generating local keypair and test envelope (no API)..."
mkdir -p "$AGENTCRED_HOME/keys"

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
const envelope = await sign('Hello from CLI test!', { 
  privateKey, 
  github: 'test-user' 
}, { agent: 'cli-test' });

console.log(JSON.stringify(envelope));
EOF
) > "$WORKDIR/envelope.json"

ENVELOPE=$(cat "$WORKDIR/envelope.json")
echo "   Envelope created (${#ENVELOPE} chars)"
echo "   OK"

echo "5. Testing verify (offline)..."
VERIFY_RESULT=$(echo "$ENVELOPE" | $CLI verify --offline --key "$AGENTCRED_HOME/public.jwk" --json)

if echo "$VERIFY_RESULT" | grep -q '"verified": *true'; then
  echo "   Verification: PASSED"
else
  echo "   ERROR: Verification failed"
  echo "   $VERIFY_RESULT"
  exit 1
fi
echo "   OK"

echo ""
echo "=== CLI Tests Complete ==="
