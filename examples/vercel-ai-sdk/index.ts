/**
 * AgentCred + Vercel AI SDK Example
 *
 * Demonstrates automatic signing of all model outputs
 * using the AgentCred middleware. Just 3 lines to integrate.
 *
 * Prerequisites:
 *   npx @agentcred-ai/cli init  (set up identity once)
 *   export GITHUB_USERNAME=your-github-username
 *   export OPENAI_API_KEY=sk-...
 */
import { openai } from '@ai-sdk/openai'
import { generateText, wrapLanguageModel } from 'ai'
import type { LanguageModelV1Middleware } from 'ai'
import { createAgentCredMiddleware } from '@agentcred-ai/vercel'
import { loadIdentity } from '@agentcred-ai/sdk'

async function main() {
  // 1. Load your identity (set up once with: npx @agentcred-ai/cli init)
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const githubUsername = env.GITHUB_USERNAME
  if (!githubUsername) {
    console.error('Missing GITHUB_USERNAME. Set: export GITHUB_USERNAME=your-github-username')
    return
  }

  const loaded = await loadIdentity(githubUsername)
  if (!loaded) {
    console.error('No identity found. Run: npx @agentcred-ai/cli init')
    return
  }

  // 2. Create signed model — all outputs are now cryptographically signed! (3 lines)
  const middleware = createAgentCredMiddleware({
    github: githubUsername,
    privateKey: loaded.privateKey,
  }) as unknown as LanguageModelV1Middleware

  const signedModel = wrapLanguageModel({
    model: openai('gpt-4o'),
    middleware,
  })

  // 3. Use as normal — output includes AgentCred envelope
  const result = await generateText({
    model: signedModel,
    prompt: 'Write a one-sentence weather summary for San Francisco.',
  })

  console.log('Signed output:', result.text)
}

main().catch(console.error)
