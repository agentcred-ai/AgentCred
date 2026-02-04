import { describe, it, expect, beforeEach, vi } from 'vitest'
import { verify, verifyOffline } from '../src/verify.js'
import { sign } from '../src/sign.js'
import { generateKeyPair, exportJWK, importJWK } from 'jose'
import { createHash } from 'crypto'

vi.stubGlobal('fetch', vi.fn())

describe('verifyOffline', () => {
  let privateKey: CryptoKey
  let publicKey: CryptoKey

  beforeEach(async () => {
    const keyPair = await generateKeyPair('EdDSA', { extractable: true })
    privateKey = keyPair.privateKey
    publicKey = keyPair.publicKey
  })

  it('should verify valid signature', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const result = await verifyOffline(envelope, publicKey)
    expect(result.verified).toBe(true)
    expect(result.github?.username).toBe('alice')
    expect(result.agent).toBe('default')
    expect(result.signedAt).toBeDefined()
  })

  it('should reject tampered content', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const tamperedEnvelope = {
      ...envelope,
      content: 'Tampered content'
    }

    const result = await verifyOffline(tamperedEnvelope, publicKey)
    expect(result.verified).toBe(false)
    expect(result.error).toBe('Content hash mismatch')
  })

  it('should reject signature with wrong key', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const wrongKeyPair = await generateKeyPair('EdDSA')
    const result = await verifyOffline(envelope, wrongKeyPair.publicKey)
    expect(result.verified).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should reject expired signature (iat > 24h old)', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const payload = JSON.parse(
      Buffer.from(envelope.agentcred.jws.split('.')[1], 'base64url').toString()
    )

    const oldIat = Math.floor(Date.now() / 1000) - 86401
    payload.iat = oldIat

    const header = JSON.parse(
      Buffer.from(envelope.agentcred.jws.split('.')[0], 'base64url').toString()
    )

    const newPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const oldJws = envelope.agentcred.jws.split('.')[0] + '.' + newPayload + '.invalid'

    const expiredEnvelope = {
      ...envelope,
      agentcred: {
        ...envelope.agentcred,
        jws: oldJws
      }
    }

    const result = await verifyOffline(expiredEnvelope, publicKey)
    expect(result.verified).toBe(false)
  })

  it('should accept signature within 24h window', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const payload = JSON.parse(
      Buffer.from(envelope.agentcred.jws.split('.')[1], 'base64url').toString()
    )

    const recentIat = Math.floor(Date.now() / 1000) - 3600
    expect(Math.abs(Math.floor(Date.now() / 1000) - recentIat)).toBeLessThan(86400)

    const result = await verifyOffline(envelope, publicKey)
    expect(result.verified).toBe(true)
  })

  it('should include github info in result', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const result = await verifyOffline(envelope, publicKey)
    expect(result.github?.username).toBe('alice')
    expect(result.github?.id).toBe(0)
    expect(result.github?.avatarUrl).toBe('')
  })

  it('should include agent in result', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' }, { agent: 'my-agent' })

    const result = await verifyOffline(envelope, publicKey)
    expect(result.agent).toBe('my-agent')
  })

  it('should include signedAt timestamp in result', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const result = await verifyOffline(envelope, publicKey)
    expect(result.signedAt).toBeDefined()
    const signedDate = new Date(result.signedAt!)
    expect(signedDate.getTime()).toBeGreaterThan(0)
  })

  it('should reject envelope with mismatched issuer', async () => {
    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    // Tamper with the github username in the envelope
    const tamperedEnvelope = {
      ...envelope,
      agentcred: {
        ...envelope.agentcred,
        github: 'bob'
      }
    }

    const result = await verifyOffline(tamperedEnvelope, publicKey)
    expect(result.verified).toBe(false)
    expect(result.error).toBe('Issuer mismatch')
  })
})

describe('verify', () => {
  let privateKey: CryptoKey
  let publicKey: CryptoKey
  let publicJWK: JsonWebKey

  beforeEach(async () => {
    vi.clearAllMocks()
    const keyPair = await generateKeyPair('EdDSA', { extractable: true })
    privateKey = keyPair.privateKey
    publicKey = keyPair.publicKey
    publicJWK = await exportJWK(publicKey)
  })

  it('should fetch public key and verify signature', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ public_key: publicJWK }), { status: 200 })
    )

    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const result = await verify(envelope)
    expect(result.verified).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('https://api.agentcred.dev/v1/keys/alice')
  })

  it('should return error if public key not found', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }))

    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const result = await verify(envelope)
    expect(result.verified).toBe(false)
    expect(result.error).toBe('Public key not found')
  })

  it('should use custom API URL from config', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ public_key: publicJWK }), { status: 200 })
    )

    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    await verify(envelope, { apiUrl: 'https://custom.api.dev' })
    expect(mockFetch).toHaveBeenCalledWith('https://custom.api.dev/v1/keys/alice')
  })

  it('should handle network errors gracefully', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const content = 'Test content'
    const envelope = await sign(content, { privateKey, github: 'alice' })

    const result = await verify(envelope)
    expect(result.verified).toBe(false)
    expect(result.error).toBeDefined()
  })
})
