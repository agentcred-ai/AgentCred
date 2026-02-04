/**
 * AgentCred + Mastra Example
 *
 * Demonstrates wrapping Mastra tools to auto-sign outputs,
 * plus using standalone AgentCred tools with Mastra agents.
 *
 * Prerequisites:
 *   npx @agentcred-ai/cli init  (set up identity once)
 *   export GITHUB_USERNAME=your-github-username
 */
import { signedTool, createAgentCredTools } from '@agentcred-ai/mastra'
import { loadIdentity } from '@agentcred-ai/sdk'

async function main() {
  const identity = await loadIdentity(process.env.GITHUB_USERNAME!)
  if (!identity) {
    console.error('No identity found. Run: npx @agentcred-ai/cli init')
    process.exit(1)
  }

  const options = {
    github: process.env.GITHUB_USERNAME!,
    privateKey: identity.privateKey,
  }

  // Option A: Wrap any existing tool to auto-sign its output
  const searchTool = {
    id: 'search',
    description: 'Search the web',
    execute: async (query: string) => `Results for: ${query}`,
  }
  const signedSearch = signedTool(searchTool, options)

  // The wrapped tool returns an AgentCred envelope instead of raw string
  const result = await signedSearch.execute('AI agent frameworks')
  console.log('Signed tool result:', JSON.stringify(result, null, 2))

  // Option B: Use standalone AgentCred tools
  const credTools = createAgentCredTools(options)
  const envelope = await credTools.agentcred_sign.execute({
    content: 'Analysis: Q4 revenue up 15%',
  })
  console.log('Signed envelope:', JSON.stringify(envelope, null, 2))
}

main().catch(console.error)
