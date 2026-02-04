import { sign, verify } from '@agentcred-ai/sdk'
import type { SignIdentity, AgentCredEnvelope, SignOptions } from '@agentcred-ai/sdk'

/** Options for signing tool outputs */
export interface SignedToolOptions {
  /** GitHub username */
  github: string
  /** Ed25519 private key (from loadIdentity) */
  privateKey: CryptoKey | Uint8Array
  /** Agent name for the signature (defaults to tool id) */
  agent?: string
}

/** Minimal Mastra-compatible tool interface */
export interface MastraToolLike {
  id: string
  description: string
  execute: (...args: any[]) => Promise<any>
  [key: string]: unknown
}

/**
 * Wrap a Mastra tool to automatically sign its outputs with AgentCred.
 * The wrapped tool preserves all original properties (id, description, inputSchema, etc.)
 * and only modifies the execute function to sign results.
 * 
 * On signing failure, returns the original result (graceful degradation).
 */
export function signedTool<T extends MastraToolLike>(
  tool: T,
  options: SignedToolOptions
): T {
  if (!options.github || !options.privateKey) {
    throw new Error('signedTool requires github and privateKey options')
  }

  const identity: SignIdentity = { github: options.github, privateKey: options.privateKey }
  const signOpts: SignOptions = { agent: options.agent ?? tool.id }

  return {
    ...tool,
    execute: async (...args: any[]) => {
      const result = await tool.execute(...args)
      try {
        const content = typeof result === 'string' ? result : JSON.stringify(result)
        return await sign(content, identity, signOpts)
      } catch {
        // Graceful degradation: return original result on signing failure
        return result
      }
    },
  } as T
}

/**
 * Create AgentCred sign and verify tools for use with Mastra agents.
 * These are standalone tools that can be added directly to an agent's tools array.
 */
export function createAgentCredTools(options: SignedToolOptions) {
  if (!options.github || !options.privateKey) {
    throw new Error('createAgentCredTools requires github and privateKey options')
  }

  const identity: SignIdentity = { github: options.github, privateKey: options.privateKey }
  const signOpts: SignOptions = { agent: options.agent ?? 'agentcred' }

  return {
    agentcred_sign: {
      id: 'agentcred_sign',
      description: 'Sign content with AgentCred and return a verifiable envelope',
      execute: async (input: { content: string; agent?: string }) => {
        const opts = input.agent ? { ...signOpts, agent: input.agent } : signOpts
        return await sign(input.content, identity, opts)
      },
    },
    agentcred_verify: {
      id: 'agentcred_verify',
      description: 'Verify an AgentCred envelope',
      execute: async (input: { envelope: string | AgentCredEnvelope }) => {
        const envelope = typeof input.envelope === 'string'
          ? JSON.parse(input.envelope) as AgentCredEnvelope
          : input.envelope
        return await verify(envelope)
      },
    },
  }
}

// Re-exports for convenience
export type { AgentCredEnvelope, SignIdentity, SignOptions } from '@agentcred-ai/sdk'
