import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from '../src/index.js'
import { setCurrentUsername, getStorage } from '../src/tools.js'

vi.mock('@agentcred-ai/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@agentcred-ai/sdk')>()
  return {
    ...actual,
    createIdentity: vi.fn(),
    loadIdentity: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
    startDeviceFlow: vi.fn(),
  }
})

import { createIdentity, loadIdentity, sign, verify, startDeviceFlow } from '@agentcred-ai/sdk'
const mockedCreateIdentity = vi.mocked(createIdentity)
const mockedLoadIdentity = vi.mocked(loadIdentity)
const mockedSign = vi.mocked(sign)
const mockedVerify = vi.mocked(verify)
const mockedStartDeviceFlow = vi.mocked(startDeviceFlow)

async function setupClientServer() {
  const server = createServer()
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  return { server, client }
}

describe('tool listing', () => {
  let client: Client

  beforeEach(async () => {
    delete process.env.GITHUB_USERNAME
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('lists all 4 tools', async () => {
    const result = await client.listTools()
    expect(result.tools).toHaveLength(4)
    const names = result.tools.map(t => t.name)
    expect(names).toContain('agentcred_init')
    expect(names).toContain('agentcred_sign')
    expect(names).toContain('agentcred_verify')
    expect(names).toContain('agentcred_whoami')
  })

  it('agentcred_init has optional github_token param', async () => {
    const result = await client.listTools()
    const initTool = result.tools.find(t => t.name === 'agentcred_init')
    expect(initTool?.inputSchema).toMatchObject({
      type: 'object',
    })
    expect(initTool?.inputSchema.required).toBeUndefined()
  })
})

describe('agentcred_init', () => {
  let client: Client

  beforeEach(async () => {
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_USERNAME
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('calls createIdentity and returns identity info', async () => {
    mockedCreateIdentity.mockResolvedValue({
      github: { username: 'testuser', id: 123, avatarUrl: 'https://example.com/avatar' },
      publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'test' },
      fingerprint: 'abc123',
      registeredAt: '2025-01-01T00:00:00Z',
    })

    const result = await client.callTool({ name: 'agentcred_init', arguments: { github_token: 'ghp_test' } })
    expect(mockedCreateIdentity).toHaveBeenCalledWith('ghp_test', expect.objectContaining({ storage: getStorage() }))
    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    expect(text).toContain('testuser')
    expect(text).toContain('abc123')
  })

  it('calls createIdentity with OAuth when github_token not provided', async () => {
    mockedStartDeviceFlow.mockResolvedValue('oauth_token_xyz')
    
    mockedCreateIdentity.mockResolvedValue({
      github: { username: 'oauthuser', id: 456, avatarUrl: 'https://example.com/avatar2' },
      publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'oauth' },
      fingerprint: 'def456',
      registeredAt: '2025-02-02T00:00:00Z',
    })

    const result = await client.callTool({ name: 'agentcred_init', arguments: {} })
    expect(mockedStartDeviceFlow).toHaveBeenCalled()
    expect(mockedCreateIdentity).toHaveBeenCalledWith('oauth_token_xyz', expect.objectContaining({ storage: getStorage() }))
    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    expect(text).toContain('oauthuser')
    expect(text).toContain('def456')
  })
})

describe('agentcred_sign', () => {
  let client: Client

  beforeEach(async () => {
    delete process.env.GITHUB_USERNAME
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('returns error when no identity configured', async () => {
    setCurrentUsername(null)
    const result = await client.callTool({ name: 'agentcred_sign', arguments: { content: 'hello' } })
    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    expect(text).toContain('Run agentcred_init first')
  })

  it('signs content when identity is available', async () => {
    setCurrentUsername('testuser')
    const fakeKey = new Uint8Array(32)
    mockedLoadIdentity.mockResolvedValue({
      identity: {
        github: { username: 'testuser', id: 123, avatarUrl: '' },
        publicKey: { kty: 'OKP' },
        fingerprint: 'fp',
        registeredAt: '2025-01-01T00:00:00Z',
      },
      privateKey: fakeKey,
    })
    mockedSign.mockResolvedValue({
      agentcred: { v: '1.0', jws: 'signed.jws.token', github: 'testuser', agent: 'default' },
      content: 'hello',
    })

    const result = await client.callTool({ name: 'agentcred_sign', arguments: { content: 'hello' } })
    expect(result.isError).toBeFalsy()
    expect(mockedSign).toHaveBeenCalledWith('hello', { privateKey: fakeKey, github: 'testuser' }, { agent: undefined })
    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.agentcred.jws).toBe('signed.jws.token')
  })

  it('passes agent option when provided', async () => {
    setCurrentUsername('testuser')
    const fakeKey = new Uint8Array(32)
    mockedLoadIdentity.mockResolvedValue({
      identity: {
        github: { username: 'testuser', id: 123, avatarUrl: '' },
        publicKey: { kty: 'OKP' },
        fingerprint: 'fp',
        registeredAt: '2025-01-01T00:00:00Z',
      },
      privateKey: fakeKey,
    })
    mockedSign.mockResolvedValue({
      agentcred: { v: '1.0', jws: 'signed', github: 'testuser', agent: 'claude' },
      content: 'hello',
    })

    await client.callTool({ name: 'agentcred_sign', arguments: { content: 'hello', agent: 'claude' } })
    expect(mockedSign).toHaveBeenCalledWith('hello', expect.anything(), { agent: 'claude' })
  })
})

describe('agentcred_verify', () => {
  let client: Client

  beforeEach(async () => {
    delete process.env.GITHUB_USERNAME
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('returns error for invalid JSON', async () => {
    const result = await client.callTool({ name: 'agentcred_verify', arguments: { envelope: 'not-json' } })
    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    expect(text).toContain('Invalid JSON')
  })

  it('verifies a valid envelope', async () => {
    mockedVerify.mockResolvedValue({
      verified: true,
      github: { username: 'testuser', id: 123, avatarUrl: '' },
      agent: 'default',
      signedAt: '2025-01-01T00:00:00Z',
    })

    const envelope = JSON.stringify({
      agentcred: { v: '1.0', jws: 'test.jws', github: 'testuser', agent: 'default' },
      content: 'hello',
    })
    const result = await client.callTool({ name: 'agentcred_verify', arguments: { envelope } })
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text)
    expect(parsed.verified).toBe(true)
    expect(parsed.github.username).toBe('testuser')
  })

  it('returns verification failure', async () => {
    mockedVerify.mockResolvedValue({ verified: false, error: 'Public key not found' })

    const envelope = JSON.stringify({
      agentcred: { v: '1.0', jws: 'bad', github: 'unknown', agent: 'x' },
      content: 'hello',
    })
    const result = await client.callTool({ name: 'agentcred_verify', arguments: { envelope } })
    const parsed = JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text)
    expect(parsed.verified).toBe(false)
    expect(parsed.error).toContain('Public key not found')
  })
})

describe('agentcred_whoami', () => {
  let client: Client

  beforeEach(async () => {
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('returns "no identity" when not initialized', async () => {
    setCurrentUsername(null)
    const result = await client.callTool({ name: 'agentcred_whoami', arguments: {} })
    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    expect(text).toContain('No identity configured')
  })

  it('returns identity info when initialized', async () => {
    setCurrentUsername('testuser')
    mockedLoadIdentity.mockResolvedValue({
      identity: {
        github: { username: 'testuser', id: 42, avatarUrl: 'https://example.com/avatar' },
        publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'testkey' },
        fingerprint: 'fp123',
        registeredAt: '2025-01-01T00:00:00Z',
      },
      privateKey: new Uint8Array(32),
    })

    const result = await client.callTool({ name: 'agentcred_whoami', arguments: {} })
    const parsed = JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text)
    expect(parsed.github.username).toBe('testuser')
    expect(parsed.fingerprint).toBe('fp123')
  })
})
