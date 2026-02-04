#!/usr/bin/env bash
# Test Vercel AI SDK middleware
# This test uses generated keys - no external LLM API required
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing @agentcred-ai/vercel ==="

cd "$PROJECT_ROOT"

# Run Vercel package tests
echo "Running Vercel unit tests..."
pnpm --filter @agentcred-ai/vercel test

echo ""
echo "=== Vercel Integration Test ==="

WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT

cd "$WORKDIR"

# Initialize npm project
npm init -y > /dev/null 2>&1

# Install local packages
npm install "$PROJECT_ROOT/packages/vercel" "$PROJECT_ROOT/packages/sdk" jose > /dev/null 2>&1

# Create integration test
cat > test-vercel.mjs << 'EOF'
import { createAgentCredMiddleware } from '@agentcred-ai/vercel'
import { generateKeyPair } from 'jose'

async function main() {
  console.log('1. Generating Ed25519 keypair...')
  const keyPair = await generateKeyPair('EdDSA', { extractable: true })
  console.log('   OK')

  // Test middleware creation
  console.log('2. Creating AgentCred middleware...')
  const middleware = createAgentCredMiddleware({
    github: 'test-user',
    privateKey: keyPair.privateKey,
    agent: 'vercel-test',
  })

  if (typeof middleware.wrapGenerate !== 'function') throw new Error('Missing wrapGenerate')
  if (typeof middleware.wrapStream !== 'function') throw new Error('Missing wrapStream')
  console.log('   OK')

  // Test wrapGenerate
  console.log('3. Testing wrapGenerate...')
  const generateResult = await middleware.wrapGenerate({
    doGenerate: async () => ({
      text: 'Hello from Vercel AI SDK!',
      model: 'test-model',
      usage: { totalTokens: 10 },
    }),
  })

  // Original properties should be preserved
  if (generateResult.model !== 'test-model') throw new Error('Model not preserved')
  if (generateResult.usage?.totalTokens !== 10) throw new Error('Usage not preserved')

  // Text should be replaced with signed envelope
  const envelope = JSON.parse(generateResult.text)
  console.log('   Signed envelope:', JSON.stringify(envelope.agentcred, null, 2))
  
  if (envelope.agentcred.v !== '1.0') throw new Error('Invalid version')
  if (envelope.agentcred.github !== 'test-user') throw new Error('Invalid github')
  if (envelope.agentcred.agent !== 'vercel-test') throw new Error('Invalid agent')
  if (envelope.content !== 'Hello from Vercel AI SDK!') throw new Error('Content not preserved')
  console.log('   OK')

  // Test signOutputs: false
  console.log('4. Testing signOutputs: false...')
  const noSignMiddleware = createAgentCredMiddleware({
    github: 'test-user',
    privateKey: keyPair.privateKey,
    signOutputs: false,
  })

  const noSignResult = await noSignMiddleware.wrapGenerate({
    doGenerate: async () => ({ text: 'Should not be signed' }),
  })

  if (noSignResult.text !== 'Should not be signed') throw new Error('Text was modified when signOutputs=false')
  console.log('   OK')

  // Test wrapStream
  console.log('5. Testing wrapStream...')
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue({ type: 'text-delta', textDelta: 'Hello' })
      controller.enqueue({ type: 'text-delta', textDelta: ' ' })
      controller.enqueue({ type: 'text-delta', textDelta: 'World' })
      controller.close()
    },
  })

  const streamResult = await middleware.wrapStream({
    doStream: async () => ({ stream, provider: 'test-provider' }),
  })

  // Provider should be preserved
  if (streamResult.provider !== 'test-provider') throw new Error('Provider not preserved')

  // Read the stream
  const reader = streamResult.stream.getReader()
  const chunks = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  // Should have original chunks plus envelope
  if (chunks.length < 4) throw new Error('Expected at least 4 chunks (3 original + 1 envelope)')
  
  // Last chunk should contain envelope
  const lastChunk = chunks[chunks.length - 1]
  const appendedText = lastChunk.textDelta || lastChunk.delta || ''
  if (!appendedText.includes('---AGENTCRED_ENVELOPE---')) {
    throw new Error('Envelope not appended to stream')
  }
  console.log('   Stream envelope appended correctly')
  console.log('   OK')

  // Test error handling
  console.log('6. Testing error handling...')
  try {
    createAgentCredMiddleware({ github: '', privateKey: keyPair.privateKey })
    throw new Error('Should have thrown for empty github')
  } catch (e) {
    if (!e.message.includes('requires github and privateKey')) throw e
    console.log('   Correctly throws for empty github')
  }

  try {
    createAgentCredMiddleware({ github: 'test', privateKey: undefined })
    throw new Error('Should have thrown for missing privateKey')
  } catch (e) {
    if (!e.message.includes('requires github and privateKey')) throw e
    console.log('   Correctly throws for missing privateKey')
  }
  console.log('   OK')

  console.log('')
  console.log('All Vercel tests passed!')
}

main().catch(err => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
EOF

node test-vercel.mjs

echo ""
echo "=== Vercel Tests Complete ==="
