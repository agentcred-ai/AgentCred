import { sign } from '@agentcred-ai/sdk'
import type { SignIdentity, SignOptions } from '@agentcred-ai/sdk'

export interface AgentCredMiddlewareOptions {
  /** GitHub username */
  github: string
  /** Ed25519 private key (from loadIdentity) */
  privateKey: CryptoKey | Uint8Array
  /** Agent name for the signature (default: "vercel-ai") */
  agent?: string
  /** Whether to sign model outputs (default: true) */
  signOutputs?: boolean
}

export type AgentCredStreamChunk = {
  type: string
  [key: string]: unknown
}

type StreamResult<Chunk extends AgentCredStreamChunk> = {
  stream: ReadableStream<Chunk>
  [key: string]: unknown
}

const extractDelta = (chunk: AgentCredStreamChunk): string => {
  if (chunk.type !== 'text-delta') return ''
  const textDelta = typeof chunk.textDelta === 'string' ? chunk.textDelta : undefined
  const delta = typeof chunk.delta === 'string' ? chunk.delta : undefined
  return textDelta ?? delta ?? ''
}

export function createAgentCredMiddleware(options: AgentCredMiddlewareOptions) {
  if (!options.github || !options.privateKey) {
    throw new Error('AgentCred middleware requires github and privateKey options')
  }

  const identity: SignIdentity = {
    github: options.github,
    privateKey: options.privateKey,
  }
  const signOpts: SignOptions = { agent: options.agent ?? 'vercel-ai' }
  const shouldSign = options.signOutputs !== false

  return {
    wrapGenerate: async <T extends { text?: string }>(
      { doGenerate }: { doGenerate: () => Promise<T> }
    ): Promise<T> => {
      const result = await doGenerate()
      if (!shouldSign || !result.text) return result
      const envelope = await sign(result.text, identity, signOpts)
      return { ...result, text: JSON.stringify(envelope) }
    },
    wrapStream: async <T extends StreamResult<AgentCredStreamChunk>>(
      { doStream }: { doStream: () => Promise<T> }
    ): Promise<T> => {
      const result = await doStream()
      if (!shouldSign) return result

      let collectedText = ''
      const transformStream = new TransformStream<AgentCredStreamChunk, AgentCredStreamChunk>({
        transform(chunk, controller) {
          if (chunk.type === 'text-delta') {
            collectedText += extractDelta(chunk)
          }
          controller.enqueue(chunk)
        },
        async flush(controller) {
          if (collectedText) {
            const envelope = await sign(collectedText, identity, signOpts)
            const serialized = `\n\n---AGENTCRED_ENVELOPE---\n${JSON.stringify(envelope)}`
            controller.enqueue({
              type: 'text-delta',
              textDelta: serialized,
              delta: serialized,
            })
          }
        },
      })

      return { ...result, stream: result.stream.pipeThrough(transformStream) }
    },
  }
}

export type { AgentCredEnvelope, SignIdentity, SignOptions } from '@agentcred-ai/sdk'
