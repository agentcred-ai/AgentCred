import { beforeEach, describe, expect, it } from 'vitest'
import { generateKeyPair } from 'jose'
import { createAgentCredMiddleware } from '../src/index.js'
import type { AgentCredEnvelope, AgentCredMiddlewareOptions, AgentCredStreamChunk } from '../src/index.js'

describe('createAgentCredMiddleware', () => {
  let privateKey: CryptoKey

  beforeEach(async () => {
    const keyPair = await generateKeyPair('EdDSA', { extractable: true })
    privateKey = keyPair.privateKey
  })

  it('returns wrapGenerate and wrapStream methods', () => {
    const middleware = createAgentCredMiddleware({
      github: 'alice',
      privateKey,
    })

    expect(typeof middleware.wrapGenerate).toBe('function')
    expect(typeof middleware.wrapStream).toBe('function')
  })

  it('throws when github is missing', () => {
    const options = { privateKey } as AgentCredMiddlewareOptions
    expect(() => createAgentCredMiddleware(options)).toThrow(
      'AgentCred middleware requires github and privateKey options'
    )
  })

  it('throws when privateKey is missing', () => {
    const options = { github: 'alice' } as AgentCredMiddlewareOptions
    expect(() => createAgentCredMiddleware(options)).toThrow(
      'AgentCred middleware requires github and privateKey options'
    )
  })

  it('wrapGenerate signs model text output', async () => {
    const middleware = createAgentCredMiddleware({
      github: 'alice',
      privateKey,
    })

    const result = await middleware.wrapGenerate({
      doGenerate: async () => ({ text: 'Hello from Vercel', model: 'test' }),
    })

    expect(result.model).toBe('test')
    expect(typeof result.text).toBe('string')

    const envelope = JSON.parse(result.text) as AgentCredEnvelope
    expect(envelope.agentcred.v).toBe('1.0')
    expect(envelope.agentcred.jws).toBeDefined()
    expect(envelope.agentcred.github).toBe('alice')
    expect(envelope.agentcred.agent).toBe('vercel-ai')
    expect(envelope.content).toBe('Hello from Vercel')
  })

  it('wrapGenerate returns original result when signOutputs is false', async () => {
    const middleware = createAgentCredMiddleware({
      github: 'alice',
      privateKey,
      signOutputs: false,
    })

    const original = { text: 'Hello', usage: { totalTokens: 3 } }
    const result = await middleware.wrapGenerate({
      doGenerate: async () => original,
    })

    expect(result).toBe(original)
  })

  it('wrapGenerate returns original result when text is empty', async () => {
    const middleware = createAgentCredMiddleware({
      github: 'alice',
      privateKey,
    })

    const original = { text: '' }
    const result = await middleware.wrapGenerate({
      doGenerate: async () => original,
    })

    expect(result).toBe(original)
  })

  it('wrapStream collects deltas and appends signed envelope', async () => {
    const middleware = createAgentCredMiddleware({
      github: 'alice',
      privateKey,
    })

    const stream = new ReadableStream<AgentCredStreamChunk>({
      start(controller) {
        controller.enqueue({ type: 'text-start', id: '1' })
        controller.enqueue({ type: 'text-delta', id: '1', delta: 'Hello' })
        controller.enqueue({ type: 'text-delta', id: '1', textDelta: ' world' })
        controller.enqueue({ type: 'text-end', id: '1' })
        controller.close()
      },
    })

    const result = await middleware.wrapStream({
      doStream: async () => ({ stream, provider: 'test' }),
    })

    const reader = result.stream.getReader()
    const chunks: AgentCredStreamChunk[] = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    expect(result.provider).toBe('test')
    expect(chunks.map((chunk) => chunk.type)).toEqual([
      'text-start',
      'text-delta',
      'text-delta',
      'text-end',
      'text-delta',
    ])

    const appended = chunks[chunks.length - 1]
    const appendedText =
      typeof appended.textDelta === 'string'
        ? appended.textDelta
        : typeof appended.delta === 'string'
          ? appended.delta
          : ''

    expect(appendedText).toContain('---AGENTCRED_ENVELOPE---')

    const parts = appendedText.split('---AGENTCRED_ENVELOPE---\n')
    const envelope = JSON.parse(parts[1] ?? '') as AgentCredEnvelope
    expect(envelope.agentcred.github).toBe('alice')
    expect(envelope.agentcred.agent).toBe('vercel-ai')
    expect(envelope.content).toBe('Hello world')
  })
})
