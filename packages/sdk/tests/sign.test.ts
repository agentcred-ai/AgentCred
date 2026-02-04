import { describe, it, expect, beforeEach } from 'vitest'
import { sign } from '../src/sign.js'
import { generateKeyPair, exportJWK } from 'jose'
import { createHash } from 'crypto'

describe('sign', () => {
  let privateKey: CryptoKey
  let publicKey: CryptoKey

  beforeEach(async () => {
    const keyPair = await generateKeyPair('EdDSA', { extractable: true })
    privateKey = keyPair.privateKey
    publicKey = keyPair.publicKey
  })

  it('should create valid JWS envelope', async () => {
    const content = 'Hello, World!'
    const envelope = await sign(content, {
      privateKey,
      github: 'alice'
    })

    expect(envelope.agentcred.v).toBe('1.0')
    expect(envelope.agentcred.jws).toBeDefined()
    expect(envelope.agentcred.github).toBe('alice')
    expect(envelope.agentcred.agent).toBe('default')
    expect(envelope.content).toBe(content)
  })

  it('should include custom agent in envelope', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' }, { agent: 'my-agent' })

    expect(envelope.agentcred.agent).toBe('my-agent')
  })

  it('should create unique nonce for each signature', async () => {
    const content = 'Test content'
    const envelope1 = await sign(content, { privateKey, github: 'alice' })
    const envelope2 = await sign(content, { privateKey, github: 'alice' })

    const payload1 = JSON.parse(
      Buffer.from(envelope1.agentcred.jws.split('.')[1], 'base64url').toString()
    )
    const payload2 = JSON.parse(
      Buffer.from(envelope2.agentcred.jws.split('.')[1], 'base64url').toString()
    )

    expect(payload1.nonce).not.toBe(payload2.nonce)
  })

  it('should hash content with SHA-256', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const expectedHash = createHash('sha256').update(content).digest('hex')
    const payload = JSON.parse(
      Buffer.from(envelope.agentcred.jws.split('.')[1], 'base64url').toString()
    )

    expect(payload.content_hash).toBe(`sha256:${expectedHash}`)
  })

  it('should include correct protected header', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const header = JSON.parse(
      Buffer.from(envelope.agentcred.jws.split('.')[0], 'base64url').toString()
    )

    expect(header.alg).toBe('EdDSA')
    expect(header.typ).toBe('agentcred+jwt')
    expect(header.kid).toBe('alice@agentcred')
  })

  it('should include payload claims', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' }, { agent: 'test-agent' })

    const payload = JSON.parse(
      Buffer.from(envelope.agentcred.jws.split('.')[1], 'base64url').toString()
    )

    expect(payload.iss).toBe('alice@agentcred')
    expect(payload.sub).toBe('test-agent')
    expect(payload.iat).toBeDefined()
    expect(typeof payload.iat).toBe('number')
    expect(payload.content_hash).toBeDefined()
    expect(payload.content_type).toBe('text/plain')
    expect(payload.nonce).toBeDefined()
  })

  it('should use custom content type', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' }, { contentType: 'application/json' })

    const payload = JSON.parse(
      Buffer.from(envelope.agentcred.jws.split('.')[1], 'base64url').toString()
    )

    expect(payload.content_type).toBe('application/json')
  })

  it('should create valid JWS format (three parts separated by dots)', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const parts = envelope.agentcred.jws.split('.')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBeDefined()
    expect(parts[1]).toBeDefined()
    expect(parts[2]).toBeDefined()
  })
})
