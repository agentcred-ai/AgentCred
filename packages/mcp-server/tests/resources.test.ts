import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from '../src/index.js'
import { setCurrentUsername } from '../src/tools.js'

vi.mock('@agentcred-ai/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@agentcred-ai/sdk')>()
  return {
    ...actual,
    createIdentity: vi.fn(),
    loadIdentity: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
  }
})

import { loadIdentity } from '@agentcred-ai/sdk'
const mockedLoadIdentity = vi.mocked(loadIdentity)

async function setupClientServer() {
  const server = createServer()
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  return { server, client }
}

describe('resource listing', () => {
  let client: Client

  beforeEach(async () => {
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('lists 2 resources', async () => {
    const result = await client.listResources()
    expect(result.resources).toHaveLength(2)
    const uris = result.resources.map(r => r.uri)
    expect(uris).toContain('agentcred://identity')
    expect(uris).toContain('agentcred://spec')
  })
})

describe('agentcred://identity resource', () => {
  let client: Client

  beforeEach(async () => {
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('returns error when no identity configured', async () => {
    setCurrentUsername(null)
    const result = await client.readResource({ uri: 'agentcred://identity' })
    const text = (result.contents[0] as { text: string }).text
    const parsed = JSON.parse(text)
    expect(parsed.error).toBe('No identity configured')
  })

  it('returns identity JSON when configured', async () => {
    setCurrentUsername('testuser')
    mockedLoadIdentity.mockResolvedValue({
      identity: {
        github: { username: 'testuser', id: 42, avatarUrl: '' },
        publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'key' },
        fingerprint: 'fp',
        registeredAt: '2025-01-01T00:00:00Z',
      },
      privateKey: new Uint8Array(32),
    })

    const result = await client.readResource({ uri: 'agentcred://identity' })
    const text = (result.contents[0] as { text: string }).text
    const parsed = JSON.parse(text)
    expect(parsed.github.username).toBe('testuser')
    expect(parsed.fingerprint).toBe('fp')
  })
})

describe('agentcred://spec resource', () => {
  let client: Client

  beforeEach(async () => {
    const setup = await setupClientServer()
    client = setup.client
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCurrentUsername(null)
  })

  it('returns spec link and description', async () => {
    const result = await client.readResource({ uri: 'agentcred://spec' })
    const text = (result.contents[0] as { text: string }).text
    expect(text).toContain('https://github.com/agentcred/spec')
    expect(text).toContain('Ed25519')
  })
})
