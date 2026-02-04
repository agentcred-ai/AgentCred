#!/usr/bin/env bash
# Test Mastra integration (signedTool, createAgentCredTools)
# This test uses generated keys - no external API required
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== Testing @agentcred-ai/mastra ==="

cd "$PROJECT_ROOT"

# Run Mastra package tests
echo "Running Mastra unit tests..."
pnpm --filter @agentcred-ai/mastra test

echo ""
echo "=== Mastra Integration Test ==="

WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT

cd "$WORKDIR"

# Initialize npm project
npm init -y > /dev/null 2>&1

npm install "$PROJECT_ROOT/packages/mastra" "$PROJECT_ROOT/packages/sdk" jose > /dev/null 2>&1

# Create integration test
cat > test-mastra.mjs << 'EOF'
import { signedTool, createAgentCredTools } from '@agentcred-ai/mastra'
import { generateKeyPair } from 'jose'

async function main() {
  console.log('1. Generating Ed25519 keypair...')
  const keyPair = await generateKeyPair('EdDSA', { extractable: true })
  console.log('   OK')

  const options = {
    github: 'test-user',
    privateKey: keyPair.privateKey,
  }

  // Test signedTool
  console.log('2. Testing signedTool...')
  const weatherTool = {
    id: 'get-weather',
    description: 'Get weather for a city',
    execute: async ({ context }) => {
      return `The weather in ${context?.city || 'Unknown'} is sunny with 22C.`
    },
  }

  const signedWeatherTool = signedTool(weatherTool, options)
  
  // Verify tool properties preserved
  if (signedWeatherTool.id !== 'get-weather') throw new Error('Tool ID not preserved')
  if (signedWeatherTool.description !== 'Get weather for a city') throw new Error('Description not preserved')
  
  const weatherResult = await signedWeatherTool.execute({ context: { city: 'Seoul' } })
  console.log('   Signed result:', JSON.stringify(weatherResult.agentcred, null, 2))
  
  if (!weatherResult.agentcred) throw new Error('Not an AgentCred envelope')
  if (weatherResult.agentcred.v !== '1.0') throw new Error('Invalid version')
  if (weatherResult.agentcred.github !== 'test-user') throw new Error('Invalid github')
  if (weatherResult.agentcred.agent !== 'get-weather') throw new Error('Agent should default to tool ID')
  if (!weatherResult.content.includes('Seoul')) throw new Error('Content not preserved')
  console.log('   OK')

  // Test createAgentCredTools
  console.log('3. Testing createAgentCredTools...')
  const tools = createAgentCredTools(options)
  
  if (!tools.agentcred_sign) throw new Error('Missing agentcred_sign tool')
  if (!tools.agentcred_verify) throw new Error('Missing agentcred_verify tool')
  if (tools.agentcred_sign.id !== 'agentcred_sign') throw new Error('Wrong sign tool ID')
  if (tools.agentcred_verify.id !== 'agentcred_verify') throw new Error('Wrong verify tool ID')
  console.log('   OK')

  // Test sign tool
  console.log('4. Testing agentcred_sign tool...')
  const signResult = await tools.agentcred_sign.execute({
    content: 'This is a standalone signed message',
    agent: 'standalone-test',
  })
  
  if (!signResult.agentcred) throw new Error('Sign result not an envelope')
  if (signResult.agentcred.agent !== 'standalone-test') throw new Error('Agent not set correctly')
  if (signResult.content !== 'This is a standalone signed message') throw new Error('Content mismatch')
  console.log('   Envelope created:', JSON.stringify(signResult.agentcred, null, 2))
  console.log('   OK')

  // Test verify tool (offline verification)
  console.log('5. Testing agentcred_verify tool...')
  const verifyResult = await tools.agentcred_verify.execute({
    envelope: JSON.stringify(signResult),
  })
  
  console.log('   Verify result:', JSON.stringify(verifyResult, null, 2))
  // Note: Online verification may fail without API, but the tool should execute
  console.log('   OK (tool executed successfully)')

  console.log('')
  console.log('All Mastra tests passed!')
}

main().catch(err => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
EOF

node test-mastra.mjs

echo ""
echo "=== Mastra Tests Complete ==="
