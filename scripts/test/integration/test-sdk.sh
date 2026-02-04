#!/usr/bin/env bash
# Test SDK core functions (sign, verify offline)
# This test uses generated keys - no external API required
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing @agentcred-ai/sdk ==="

cd "$PROJECT_ROOT"

# Run SDK package tests
echo "Running SDK unit tests..."
pnpm --filter @agentcred-ai/sdk test

echo ""
echo "=== SDK Integration Test ==="

# Create a quick integration test using Node.js
WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT

cd "$WORKDIR"

# Initialize npm project and install local SDK
npm init -y > /dev/null 2>&1
npm install "$PROJECT_ROOT/packages/sdk" jose > /dev/null 2>&1

# Create test file that uses the built SDK
cat > test-sdk.mjs << 'EOF'
import { sign, verifyOffline, MemoryKeyStorage } from '@agentcred-ai/sdk'
import { generateKeyPair, exportJWK, importJWK } from 'jose'

async function main() {
  console.log('1. Generating Ed25519 keypair...')
  const keyPair = await generateKeyPair('EdDSA', { extractable: true })
  console.log('   OK')

  console.log('2. Signing content...')
  const envelope = await sign(
    'Hello from SDK integration test!',
    { privateKey: keyPair.privateKey, github: 'test-user' },
    { agent: 'sdk-test' }
  )
  console.log('   Envelope created:', JSON.stringify(envelope.agentcred, null, 2))
  
  // Validate envelope structure
  if (envelope.agentcred.v !== '1.0') throw new Error('Invalid version')
  if (envelope.agentcred.github !== 'test-user') throw new Error('Invalid github')
  if (envelope.agentcred.agent !== 'sdk-test') throw new Error('Invalid agent')
  if (!envelope.agentcred.jws) throw new Error('Missing JWS')
  if (envelope.content !== 'Hello from SDK integration test!') throw new Error('Content mismatch')
  console.log('   OK')

  console.log('3. Verifying offline...')
  const result = await verifyOffline(envelope, keyPair.publicKey)
  console.log('   Result:', JSON.stringify(result, null, 2))
  
  if (!result.verified) throw new Error('Verification failed: ' + result.error)
  if (result.github?.username !== 'test-user') throw new Error('GitHub mismatch')
  if (result.agent !== 'sdk-test') throw new Error('Agent mismatch')
  console.log('   OK')

  console.log('4. Testing MemoryKeyStorage...')
  const storage = new MemoryKeyStorage()
  const privateJWK = await exportJWK(keyPair.privateKey)
  await storage.save('alice', privateJWK)
  const loaded = await storage.load('alice')
  if (!loaded) throw new Error('Failed to load from storage')
  const list = await storage.list()
  if (!list.includes('alice')) throw new Error('List does not include alice')
  console.log('   OK')

  console.log('')
  console.log('All SDK tests passed!')
}

main().catch(err => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
EOF

node test-sdk.mjs

echo ""
echo "=== SDK Tests Complete ==="
