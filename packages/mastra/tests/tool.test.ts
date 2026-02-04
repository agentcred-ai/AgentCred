import { describe, it, expect } from 'vitest'
import { signedTool, createAgentCredTools } from '../src/index.js'
import type { AgentCredEnvelope } from '@agentcred-ai/sdk'
import type { MastraToolLike } from '../src/index.js'

async function createTestPrivateKey(): Promise<CryptoKey> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  )
  return keyPair.privateKey
}

describe('mastra signed tools', () => {
  it('preserves tool properties when wrapping', async () => {
    const privateKey = await createTestPrivateKey()
    const tool: MastraToolLike = {
      id: 'example_tool',
      description: 'Example tool',
      inputSchema: { type: 'object' },
      execute: async () => ({ ok: true }),
    }

    const wrapped = signedTool(tool, { github: 'alice', privateKey })

    expect(wrapped.id).toBe('example_tool')
    expect(wrapped.description).toBe('Example tool')
    expect(wrapped.inputSchema).toEqual({ type: 'object' })
  })

  it('returns AgentCred envelope from wrapped execute', async () => {
    const privateKey = await createTestPrivateKey()
    const tool: MastraToolLike = {
      id: 'status',
      description: 'Status tool',
      execute: async () => ({ status: 'ok' }),
    }

    const wrapped = signedTool(tool, { github: 'alice', privateKey })
    const result = await wrapped.execute()
    const envelope = result as unknown as AgentCredEnvelope

    expect(envelope).toHaveProperty('agentcred')
    expect(envelope).toHaveProperty('content')
    expect(envelope.agentcred.v).toBe('1.0')
    expect(envelope.agentcred.github).toBe('alice')
  })

  it('uses tool id as default agent name', async () => {
    const privateKey = await createTestPrivateKey()
    const tool: MastraToolLike = {
      id: 'default-agent',
      description: 'Agent tool',
      execute: async () => 'hello',
    }

    const wrapped = signedTool(tool, { github: 'alice', privateKey })
    const result = await wrapped.execute()
    const envelope = result as unknown as AgentCredEnvelope

    expect(envelope.agentcred.agent).toBe('default-agent')
  })

  it('throws when github or privateKey missing', async () => {
    const privateKey = await createTestPrivateKey()
    const tool: MastraToolLike = {
      id: 'tool',
      description: 'Tool',
      execute: async () => 'ok',
    }

    expect(() => signedTool(tool, { github: '', privateKey })).toThrow(
      'signedTool requires github and privateKey options'
    )
    expect(() => signedTool(tool, { github: 'alice', privateKey: undefined as unknown as CryptoKey | Uint8Array })).toThrow(
      'signedTool requires github and privateKey options'
    )
  })

  it('returns original result when signing fails', async () => {
    const tool: MastraToolLike = {
      id: 'fail-sign',
      description: 'Fails to sign',
      execute: async () => ({ ok: true }),
    }

    const wrapped = signedTool(tool, { github: 'alice', privateKey: new Uint8Array(0) })
    const result = await wrapped.execute()

    expect(result).toEqual({ ok: true })
  })

  it('creates agentcred_sign and agentcred_verify tools', async () => {
    const privateKey = await createTestPrivateKey()
    const tools = createAgentCredTools({ github: 'alice', privateKey })

    expect(tools.agentcred_sign).toBeDefined()
    expect(tools.agentcred_verify).toBeDefined()
    expect(tools.agentcred_sign.id).toBe('agentcred_sign')
    expect(tools.agentcred_verify.id).toBe('agentcred_verify')
  })

  it('agentcred_sign produces valid envelope', async () => {
    const privateKey = await createTestPrivateKey()
    const tools = createAgentCredTools({ github: 'alice', privateKey })

    const result = await tools.agentcred_sign.execute({ content: 'hello' })
    const envelope = result as AgentCredEnvelope

    expect(envelope.agentcred.v).toBe('1.0')
    expect(envelope.agentcred.github).toBe('alice')
    expect(envelope.content).toBe('hello')
  })
})
