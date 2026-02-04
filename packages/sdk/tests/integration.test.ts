import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createIdentity, loadIdentity } from '../src/identity.js'
import { sign } from '../src/sign.js'
import { verifyOffline } from '../src/verify.js'
import { MemoryKeyStorage } from '../src/storage.js'
import { importJWK } from 'jose'

vi.stubGlobal('fetch', vi.fn())

describe('Integration: Full Flow', () => {
  let storage: MemoryKeyStorage

  beforeEach(() => {
    vi.clearAllMocks()
    storage = new MemoryKeyStorage()
  })

  it('should complete full flow: create identity -> sign -> verify', async () => {
    const mockFetch = vi.mocked(global.fetch)

    const githubProfile = {
      login: 'alice',
      id: 12345,
      avatar_url: 'https://avatars.githubusercontent.com/u/12345'
    }

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(githubProfile), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ registered_at: '2026-02-01T00:00:00Z' }), {
          status: 200
        })
      )

    const identity = await createIdentity('github-token', { storage })

    expect(identity.github.username).toBe('alice')
    expect(identity.publicKey).toBeDefined()

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ public_key: identity.publicKey }), { status: 200 })
    )

    const loadResult = await loadIdentity('alice', { storage })
    expect(loadResult).toBeDefined()
    expect(loadResult?.identity.github.username).toBe('alice')
    expect(loadResult?.privateKey).toBeDefined()

    const content = 'Important message'
    const envelope = await sign(content, {
      privateKey: loadResult!.privateKey,
      github: 'alice'
    })

    expect(envelope.agentcred.jws).toBeDefined()
    expect(envelope.content).toBe(content)

    const publicKey = await importJWK(identity.publicKey, 'EdDSA')
    const verifyResult = await verifyOffline(envelope, publicKey)

    expect(verifyResult.verified).toBe(true)
    expect(verifyResult.github?.username).toBe('alice')
    expect(verifyResult.signedAt).toBeDefined()
  })

  it('should handle multiple identities in storage', async () => {
    const mockFetch = vi.mocked(global.fetch)

    const aliceProfile = {
      login: 'alice',
      id: 12345,
      avatar_url: 'https://avatars.githubusercontent.com/u/12345'
    }

    const bobProfile = {
      login: 'bob',
      id: 67890,
      avatar_url: 'https://avatars.githubusercontent.com/u/67890'
    }

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(aliceProfile), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ registered_at: '2026-02-01T00:00:00Z' }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(bobProfile), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ registered_at: '2026-02-01T00:00:00Z' }), {
          status: 200
        })
      )

    const aliceIdentity = await createIdentity('alice-token', { storage })
    const bobIdentity = await createIdentity('bob-token', { storage })

    expect(aliceIdentity.github.username).toBe('alice')
    expect(bobIdentity.github.username).toBe('bob')

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ public_key: aliceIdentity.publicKey }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ public_key: bobIdentity.publicKey }), { status: 200 })
      )

    const aliceLoaded = await loadIdentity('alice', { storage })
    const bobLoaded = await loadIdentity('bob', { storage })

    expect(aliceLoaded?.identity.github.username).toBe('alice')
    expect(bobLoaded?.identity.github.username).toBe('bob')

    const aliceContent = 'Alice message'
    const bobContent = 'Bob message'

    const aliceEnvelope = await sign(aliceContent, {
      privateKey: aliceLoaded!.privateKey,
      github: 'alice'
    })

    const bobEnvelope = await sign(bobContent, {
      privateKey: bobLoaded!.privateKey,
      github: 'bob'
    })

    const alicePublicKey = await importJWK(aliceIdentity.publicKey, 'EdDSA')
    const bobPublicKey = await importJWK(bobIdentity.publicKey, 'EdDSA')

    const aliceVerify = await verifyOffline(aliceEnvelope, alicePublicKey)
    const bobVerify = await verifyOffline(bobEnvelope, bobPublicKey)

    expect(aliceVerify.verified).toBe(true)
    expect(aliceVerify.github?.username).toBe('alice')
    expect(bobVerify.verified).toBe(true)
    expect(bobVerify.github?.username).toBe('bob')

    expect(aliceVerify.verified).toBe(true)
    const aliceWrongVerify = await verifyOffline(aliceEnvelope, bobPublicKey)
    expect(aliceWrongVerify.verified).toBe(false)
  })

  it('should preserve signature across load/verify cycle', async () => {
    const mockFetch = vi.mocked(global.fetch)

    const githubProfile = {
      login: 'alice',
      id: 12345,
      avatar_url: 'https://avatars.githubusercontent.com/u/12345'
    }

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(githubProfile), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ registered_at: '2026-02-01T00:00:00Z' }), {
          status: 200
        })
      )

    const identity = await createIdentity('github-token', { storage })
    
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ public_key: identity.publicKey }), { status: 200 })
    )
    
    const loadResult = await loadIdentity('alice', { storage })

    const content = 'Test message'
    const envelope = await sign(content, {
      privateKey: loadResult!.privateKey,
      github: 'alice'
    })

    const publicKey = await importJWK(identity.publicKey, 'EdDSA')
    const result1 = await verifyOffline(envelope, publicKey)
    const result2 = await verifyOffline(envelope, publicKey)

    expect(result1.verified).toBe(true)
    expect(result2.verified).toBe(true)
    expect(result1.signedAt).toBe(result2.signedAt)
  })
})
