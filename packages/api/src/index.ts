import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { compactVerify, importJWK } from 'jose'

export type Env = {
  Bindings: {
    KEYS: KVNamespace
  }
}

export interface StoredKey {
  github: string
  github_id: number
  public_key: JsonWebKey
  registered_at: string
}

const JwkSchema = z.object({
  kty: z.literal('OKP'),
  crv: z.literal('Ed25519'),
  x: z.string(),
  use: z.literal('sig').optional(),
  alg: z.literal('EdDSA').optional(),
})

const RegisterKeySchema = z.object({
  public_key: JwkSchema,
})

const EnvelopeSchema = z.object({
  agentcred: z.object({
    v: z.string(),
    jws: z.string(),
    github: z.string(),
    agent: z.string(),
  }),
  content: z.string(),
})

/**
 * Simple rate limiter using KV. Known limitation: non-atomic read-modify-write
 * allows concurrent requests to bypass limits. For strict rate limiting,
 * migrate to Cloudflare Durable Objects with atomic counters.
 * Current implementation is sufficient for abuse prevention, not security-critical limiting.
 */
async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  endpoint: string,
  limit: number = 60
): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60000)
  const key = `ratelimit:${ip}:${endpoint}:${minute}`
  const current = await kv.get(key)
  const count = current ? parseInt(current, 10) : 0

  if (count >= limit) {
    return false
  }

  await kv.put(key, String(count + 1), { expirationTtl: 60 })
  return true
}

async function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifyGitHubToken(
  token: string
): Promise<{ login: string; id: number } | null> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'AgentCred-API/1.0',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { login: string; id: number }
    return { login: data.login, id: data.id }
  } catch {
    return null
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

const app = new Hono<Env>()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.get('/', (c) => {
  return c.json({
    name: 'AgentCred API',
    version: '1.0.0',
    description: 'Human accountability protocol for AI agents',
    documentation: 'https://agentcred.dev',
    endpoints: {
      health: 'GET /v1/health',
      register: 'POST /v1/keys',
      lookup: 'GET /v1/keys/:username',
      verify: 'POST /v1/verify',
    },
    github: 'https://github.com/agentcred-ai/agentcred',
  })
})

app.post('/v1/keys', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const allowed = await checkRateLimit(c.env.KEYS, ip, 'POST:/v1/keys', 10)
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }
  const token = authHeader.slice(7)

  const ghUser = await verifyGitHubToken(token)
  if (!ghUser) {
    return c.json({ error: 'Invalid GitHub token' }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const parsed = RegisterKeySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body' }, 400)
  }

  const storedKey: StoredKey = {
    github: ghUser.login,
    github_id: ghUser.id,
    public_key: parsed.data.public_key as JsonWebKey,
    registered_at: new Date().toISOString(),
  }

  await c.env.KEYS.put(`key:${ghUser.login}`, JSON.stringify(storedKey))

  return c.json(
    {
      github: ghUser.login,
      public_key: parsed.data.public_key,
      registered_at: storedKey.registered_at,
    },
    201
  )
})

app.get('/v1/keys/:username', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const allowed = await checkRateLimit(c.env.KEYS, ip, 'GET:/v1/keys', 120)
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  const username = c.req.param('username')
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
    return c.json({ error: 'Invalid username format' }, 400)
  }
  const stored = await c.env.KEYS.get(`key:${username}`)

  if (!stored) {
    return c.json({ error: 'Key not found' }, 404)
  }

  const data: StoredKey = JSON.parse(stored)
  return c.json({
    github: data.github,
    public_key: data.public_key,
    registered_at: data.registered_at,
  })
})

app.post('/v1/verify', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const allowed = await checkRateLimit(c.env.KEYS, ip, 'POST:/v1/verify', 60)
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  let envelopeData: unknown = body
  if (
    typeof body === 'object' &&
    body !== null &&
    'envelope' in body
  ) {
    envelopeData = (body as Record<string, unknown>).envelope
  }

  const parsed = EnvelopeSchema.safeParse(envelopeData)
  if (!parsed.success) {
    return c.json(
      { verified: false, error: 'Invalid envelope format' },
      400
    )
  }

  const envelope = parsed.data
  const { jws, github: envelopeGithub } = envelope.agentcred

  const stored = await c.env.KEYS.get(`key:${envelopeGithub}`)
  if (!stored) {
    return c.json(
      { verified: false, error: `No registered key for user: ${envelopeGithub}` },
      404
    )
  }

  const storedData: StoredKey = JSON.parse(stored)

  try {
    const publicKey = await importJWK(
      { ...storedData.public_key, kty: 'OKP', crv: 'Ed25519' },
      'EdDSA'
    )

    const { payload, protectedHeader } = await compactVerify(jws, publicKey)

    if (protectedHeader.alg !== 'EdDSA') {
      return c.json({ verified: false, error: 'Invalid algorithm' }, 400)
    }

    const payloadStr = new TextDecoder().decode(payload)
    const payloadObj = JSON.parse(payloadStr) as {
      iss: string
      sub: string
      iat: number
      content_hash: string
      content_type?: string
      nonce?: string
    }

    const expectedIss = `${envelopeGithub}@agentcred`
    if (payloadObj.iss !== expectedIss) {
      return c.json({ verified: false, error: 'Issuer mismatch' }, 400)
    }

    const contentHash = await sha256Hex(envelope.content)
    const expectedHash = `sha256:${contentHash}`
    if (!constantTimeEqual(payloadObj.content_hash, expectedHash)) {
      return c.json({ verified: false, error: 'Content hash mismatch - content was tampered' }, 400)
    }

    // ±24 hours window per spec section 6.2
    const now = Math.floor(Date.now() / 1000)
    const maxAge = 24 * 60 * 60
    if (Math.abs(now - payloadObj.iat) > maxAge) {
      return c.json({ verified: false, error: 'Signature expired or timestamp out of range' }, 400)
    }

    return c.json({
      verified: true,
      github: {
        username: storedData.github,
        id: storedData.github_id,
      },
      agent: envelope.agentcred.agent,
      signed_at: new Date(payloadObj.iat * 1000).toISOString(),
    })
  } catch (err) {
    return c.json({ verified: false, error: 'Verification failed' }, 400)
  }
})

app.get('/v1/health', (c) => {
  return c.json({ status: 'ok', version: '1.0.0' })
})

export default app
