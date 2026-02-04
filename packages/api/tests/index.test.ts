import { describe, it, expect, beforeAll } from 'vitest'
import { SELF, env } from 'cloudflare:test'
import { CompactSign, exportJWK, generateKeyPair } from 'jose'
import '../src/index'

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    KEYS: KVNamespace
  }
}

async function sha256Hex(content: string): Promise<string> {
  const data = new TextEncoder().encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function createTestEnvelope(
  username: string,
  agent: string,
  content: string,
  privateKey: CryptoKey,
  overrides: {
    iat?: number
    content_hash?: string
  } = {}
) {
  const contentHash = overrides.content_hash ?? `sha256:${await sha256Hex(content)}`
  const iat = overrides.iat ?? Math.floor(Date.now() / 1000)

  const payload = JSON.stringify({
    iss: `${username}@agentcred`,
    sub: agent,
    iat,
    content_hash: contentHash,
    content_type: 'text/plain',
    nonce: crypto.randomUUID(),
  })

  const jws = await new CompactSign(new TextEncoder().encode(payload))
    .setProtectedHeader({
      alg: 'EdDSA',
      typ: 'agentcred+jwt',
      kid: `${username}@agentcred`,
    })
    .sign(privateKey)

  return {
    agentcred: {
      v: '1.0',
      jws,
      github: username,
      agent,
    },
    content,
  }
}

let testPrivateKey: CryptoKey
let testPublicJwk: JsonWebKey

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('EdDSA', {
    crv: 'Ed25519',
  })
  testPrivateKey = privateKey as CryptoKey
  testPublicJwk = await exportJWK(publicKey)
})

describe('GET /v1/health', () => {
  it('returns ok status and version', async () => {
    const res = await SELF.fetch('http://localhost/v1/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok', version: '1.0.0' })
  })

  it('includes CORS headers', async () => {
    const res = await SELF.fetch('http://localhost/v1/health', {
      headers: { Origin: 'http://example.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })
})

describe('POST /v1/keys', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: testPublicJwk }),
    })
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('Authorization')
  })

  it('returns 401 with invalid GitHub token', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_token_12345',
      },
      body: JSON.stringify({
        public_key: { kty: 'OKP', crv: 'Ed25519', x: testPublicJwk.x },
      }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects request with invalid key format (auth fails first since no mock)', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer some_fake_github_token',
      },
      body: JSON.stringify({ public_key: { kty: 'RSA', n: 'abc' } }),
    })
    expect(res.status).toBe(401)
  })
})

describe('GET /v1/keys/:username', () => {
  beforeAll(async () => {
    const storedKey = {
      github: 'testuser',
      github_id: 12345,
      public_key: { kty: 'OKP', crv: 'Ed25519', x: testPublicJwk.x },
      registered_at: '2026-01-01T00:00:00.000Z',
    }
    await env.KEYS.put('key:testuser', JSON.stringify(storedKey))
  })

  it('returns public key for existing user', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys/testuser')
    expect(res.status).toBe(200)
    const body = await res.json() as { github: string; public_key: JsonWebKey; registered_at: string }
    expect(body.github).toBe('testuser')
    expect(body.public_key.kty).toBe('OKP')
    expect(body.public_key.crv).toBe('Ed25519')
    expect(body.registered_at).toBe('2026-01-01T00:00:00.000Z')
  })

  it('returns 404 for unknown user', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys/nonexistent')
    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('not found')
  })

  it('rejects path traversal username', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys/..%2Fetc')
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Invalid username format')
  })

  it('rejects username with special characters', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys/user@domain')
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Invalid username format')
  })

  it('accepts valid username that does not exist', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys/validuser123')
    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('not found')
  })
})

describe('POST /v1/verify', () => {
  beforeAll(async () => {
    const storedKey = {
      github: 'verifyuser',
      github_id: 99999,
      public_key: { kty: 'OKP', crv: 'Ed25519', x: testPublicJwk.x },
      registered_at: '2026-01-01T00:00:00.000Z',
    }
    await env.KEYS.put('key:verifyuser', JSON.stringify(storedKey))
  })

  it('verifies a valid envelope', async () => {
    const envelope = await createTestEnvelope(
      'verifyuser',
      'test-agent',
      'Hello from a verified agent!',
      testPrivateKey
    )

    const res = await SELF.fetch('http://localhost/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { verified: boolean; github: { username: string; id: number }; agent: string }
    expect(body.verified).toBe(true)
    expect(body.github.username).toBe('verifyuser')
    expect(body.github.id).toBe(99999)
    expect(body.agent).toBe('test-agent')
  })

  it('rejects tampered content', async () => {
    const envelope = await createTestEnvelope(
      'verifyuser',
      'test-agent',
      'Original content',
      testPrivateKey
    )
    envelope.content = 'Tampered content!'

    const res = await SELF.fetch('http://localhost/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { verified: boolean; error: string }
    expect(body.verified).toBe(false)
    expect(body.error).toContain('hash mismatch')
  })

  it('rejects expired signature (>24h old)', async () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 48 * 60 * 60
    const envelope = await createTestEnvelope(
      'verifyuser',
      'test-agent',
      'Old content',
      testPrivateKey,
      { iat: twoDaysAgo }
    )

    const res = await SELF.fetch('http://localhost/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { verified: boolean; error: string }
    expect(body.verified).toBe(false)
    expect(body.error).toContain('expired')
  })

  it('rejects envelope with unknown user', async () => {
    const envelope = await createTestEnvelope(
      'unknownuser',
      'test-agent',
      'Some content',
      testPrivateKey
    )

    const res = await SELF.fetch('http://localhost/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope }),
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { verified: boolean; error: string }
    expect(body.verified).toBe(false)
  })

  it('rejects invalid envelope format', async () => {
    const res = await SELF.fetch('http://localhost/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: { invalid: true } }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { verified: boolean }
    expect(body.verified).toBe(false)
  })

  it('rejects signature signed with wrong key', async () => {
    const { privateKey: wrongKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' })
    const envelope = await createTestEnvelope(
      'verifyuser',
      'test-agent',
      'Content signed with wrong key',
      wrongKey as CryptoKey
    )

    const res = await SELF.fetch('http://localhost/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { verified: boolean; error: string }
    expect(body.verified).toBe(false)
    expect(body.error).toContain('Verification failed')
  })
})

describe('CORS', () => {
  it('responds to OPTIONS preflight', async () => {
    const res = await SELF.fetch('http://localhost/v1/keys', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    })
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
  })
})

describe('Rate Limiting', () => {
  it('returns 429 when rate limit exceeded', async () => {
    const username = `ratelimit-test-${Date.now()}`
    const minute = Math.floor(Date.now() / 60000)
    const rateLimitKey = `ratelimit:unknown:GET:/v1/keys:${minute}`
    await env.KEYS.put(rateLimitKey, '999', { expirationTtl: 60 })

    const res = await SELF.fetch(`http://localhost/v1/keys/${username}`)
    expect(res.status).toBe(429)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('Rate limit')
  })
})

describe('Root endpoint', () => {
  it('returns API information', async () => {
    const res = await SELF.fetch('http://localhost/')
    expect(res.status).toBe(200)
    const body = await res.json() as {
      name: string
      version: string
      description: string
      documentation: string
      endpoints: Record<string, string>
      github: string
    }
    expect(body.name).toBe('AgentCred API')
    expect(body.version).toBe('1.0.0')
    expect(body.endpoints).toHaveProperty('health')
    expect(body.endpoints).toHaveProperty('register')
    expect(body.endpoints).toHaveProperty('lookup')
    expect(body.endpoints).toHaveProperty('verify')
  })
})
