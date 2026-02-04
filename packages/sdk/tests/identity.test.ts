import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createIdentity, loadIdentity, resolvePublicKey } from '../src/identity.js'
import { MemoryKeyStorage } from '../src/storage.js'
import { generateKeyPair, exportJWK } from 'jose'

vi.stubGlobal('fetch', vi.fn())

describe('resolvePublicKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch public key from API', async () => {
    const mockKey: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test-key' }
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ public_key: mockKey }), { status: 200 })
    )

    const result = await resolvePublicKey('alice')
    expect(result).toEqual(mockKey)
    expect(mockFetch).toHaveBeenCalledWith('https://api.agentcred.dev/v1/keys/alice')
  })

  it('should return null on API error', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }))

    const result = await resolvePublicKey('alice')
    expect(result).toBeNull()
  })

  it('should return null on network error', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await resolvePublicKey('alice')
    expect(result).toBeNull()
  })

  it('should use custom API URL from config', async () => {
    const mockKey: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test-key' }
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ public_key: mockKey }), { status: 200 })
    )

    await resolvePublicKey('alice', { apiUrl: 'https://custom.api.dev' })
    expect(mockFetch).toHaveBeenCalledWith('https://custom.api.dev/v1/keys/alice')
  })
})

describe('createIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create identity with GitHub token', async () => {
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

    const storage = new MemoryKeyStorage()
    const identity = await createIdentity('github-token', { storage })

    expect(identity.github.username).toBe('alice')
    expect(identity.github.id).toBe(12345)
    expect(identity.publicKey).toBeDefined()
    expect(identity.fingerprint).toBeDefined()
    expect(identity.registeredAt).toBe('2026-02-01T00:00:00Z')

    const calls = mockFetch.mock.calls
    expect(calls[0][0]).toBe('https://api.github.com/user')
    expect(calls[0][1]?.headers).toEqual({ Authorization: 'Bearer github-token' })
  })

  it('should fail on GitHub authentication error', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    const storage = new MemoryKeyStorage()
    await expect(createIdentity('invalid-token', { storage })).rejects.toThrow(
      'GitHub authentication failed'
    )
  })

  it('should fail on key registration error', async () => {
    const mockFetch = vi.mocked(global.fetch)
    const githubProfile = {
      login: 'alice',
      id: 12345,
      avatar_url: 'https://avatars.githubusercontent.com/u/12345'
    }

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(githubProfile), { status: 200 }))
      .mockResolvedValueOnce(new Response('Registration failed', { status: 500 }))

    const storage = new MemoryKeyStorage()
    await expect(createIdentity('github-token', { storage })).rejects.toThrow(
      'Key registration failed'
    )
  })

  it('should save private key to storage', async () => {
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

    const storage = new MemoryKeyStorage()
    await createIdentity('github-token', { storage })

    const savedKey = await storage.load('alice')
    expect(savedKey).toBeDefined()
    expect(savedKey?.kty).toBe('OKP')
    expect(savedKey?.crv).toBe('Ed25519')
  })
})

describe('loadIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load identity from storage', async () => {
    const mockFetch = vi.mocked(global.fetch)
    
    const keyPair = await generateKeyPair('EdDSA', { extractable: true })
    const privateJWK = await exportJWK(keyPair.privateKey)
    const publicJWK = await exportJWK(keyPair.publicKey)

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ public_key: publicJWK }), { status: 200 })
    )

    const storage = new MemoryKeyStorage()
    await storage.save('alice', privateJWK)

    const result = await loadIdentity('alice', { storage })
    expect(result).toBeDefined()
    expect(result?.identity.github.username).toBe('alice')
    expect(result?.privateKey).toBeDefined()
  })

  it('should return null if key not in storage', async () => {
    const storage = new MemoryKeyStorage()
    const result = await loadIdentity('bob', { storage })
    expect(result).toBeNull()
  })

  it('should return null if public key cannot be resolved', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }))

    const keyPair = await generateKeyPair('EdDSA', { extractable: true })
    const privateJWK = await exportJWK(keyPair.privateKey)

    const storage = new MemoryKeyStorage()
    await storage.save('alice', privateJWK)

    const result = await loadIdentity('alice', { storage })
    expect(result).toBeNull()
  })
})
