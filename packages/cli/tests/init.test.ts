import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initCommand } from '../src/commands/init.js'

vi.mock('@agentcred-ai/sdk', () => ({
  createIdentity: vi.fn(),
  FileSystemKeyStorage: vi.fn(),
  startDeviceFlow: vi.fn(),
}))

import { createIdentity, startDeviceFlow } from '@agentcred-ai/sdk'

const mockCreateIdentity = vi.mocked(createIdentity)
const mockStartDeviceFlow = vi.mocked(startDeviceFlow)

describe('init command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env['GITHUB_TOKEN']
  })

  it('creates identity with --token flag', async () => {
    mockCreateIdentity.mockResolvedValue({
      github: { username: 'testuser', id: 123, avatarUrl: '' },
      publicKey: {} as JsonWebKey,
      fingerprint: 'abc123',
      registeredAt: '2025-01-01T00:00:00Z',
    })

    await initCommand(['--token', 'ghp_test123'])

    expect(mockCreateIdentity).toHaveBeenCalledWith('ghp_test123', { storage: expect.anything() })
    expect(console.log).toHaveBeenCalledWith('\u2713 Identity created for @testuser')
  })

  it('throws when no token provided', async () => {
    mockStartDeviceFlow.mockRejectedValue(new Error('Device flow failed'))
    await expect(initCommand([])).rejects.toThrow('Device flow failed')
  })

  it('shows help with --help flag', async () => {
    await initCommand(['--help'])
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('agentcred init'))
  })

  it('outputs JSON when --json flag is used', async () => {
    mockCreateIdentity.mockResolvedValue({
      github: { username: 'testuser', id: 123, avatarUrl: '' },
      publicKey: {} as JsonWebKey,
      fingerprint: 'abc123def456',
      registeredAt: '2025-01-01T00:00:00Z',
    })

    await initCommand(['--token', 'ghp_test123', '--json'])

    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string
    const parsed = JSON.parse(output)
    expect(parsed.username).toBe('testuser')
    expect(parsed.fingerprint).toBe('abc123def456')
    expect(parsed.registeredAt).toBe('2025-01-01T00:00:00Z')
  })

   it('outputs human-friendly format without --json flag', async () => {
     mockCreateIdentity.mockResolvedValue({
       github: { username: 'testuser', id: 123, avatarUrl: '' },
       publicKey: {} as JsonWebKey,
       fingerprint: 'abc123',
       registeredAt: '2025-01-01T00:00:00Z',
     })

     await initCommand(['--token', 'ghp_test123'])

     expect(console.log).toHaveBeenCalledWith('\u2713 Identity created for @testuser')
   })

   describe('OAuth Device Flow', () => {
     it('calls startDeviceFlow when no token provided', async () => {
       mockStartDeviceFlow.mockResolvedValue('oauth-token-123')
       mockCreateIdentity.mockResolvedValue({
         github: { username: 'oauthuser', id: 456, avatarUrl: '' },
         publicKey: {} as JsonWebKey,
         fingerprint: 'oauth123',
         registeredAt: '2025-01-02T00:00:00Z',
       })

       await initCommand([])

       expect(mockStartDeviceFlow).toHaveBeenCalledWith({
         onUserCode: expect.any(Function),
       })
       expect(mockCreateIdentity).toHaveBeenCalledWith('oauth-token-123', { storage: expect.anything() })
       expect(console.log).toHaveBeenCalledWith('\u2713 Identity created for @oauthuser')
     })

     it('does not call startDeviceFlow when --token flag is provided', async () => {
       mockCreateIdentity.mockResolvedValue({
         github: { username: 'patuser', id: 789, avatarUrl: '' },
         publicKey: {} as JsonWebKey,
         fingerprint: 'pat123',
         registeredAt: '2025-01-03T00:00:00Z',
       })

       await initCommand(['--token', 'ghp_pat123'])

       expect(mockStartDeviceFlow).not.toHaveBeenCalled()
       expect(mockCreateIdentity).toHaveBeenCalledWith('ghp_pat123', { storage: expect.anything() })
     })

    it('does not call startDeviceFlow when GITHUB_TOKEN env var is set', async () => {
      process.env['GITHUB_TOKEN'] = 'ghp_env123'
       mockCreateIdentity.mockResolvedValue({
         github: { username: 'envuser', id: 999, avatarUrl: '' },
         publicKey: {} as JsonWebKey,
         fingerprint: 'env123',
         registeredAt: '2025-01-04T00:00:00Z',
       })

       await initCommand([])

       expect(mockStartDeviceFlow).not.toHaveBeenCalled()
       expect(mockCreateIdentity).toHaveBeenCalledWith('ghp_env123', { storage: expect.anything() })
     })

     it('propagates error when startDeviceFlow fails', async () => {
       mockStartDeviceFlow.mockRejectedValue(new Error('OAuth flow cancelled by user'))

       await expect(initCommand([])).rejects.toThrow('OAuth flow cancelled by user')
       expect(mockCreateIdentity).not.toHaveBeenCalled()
     })

     it('outputs JSON after successful OAuth flow', async () => {
       mockStartDeviceFlow.mockResolvedValue('oauth-token-456')
       mockCreateIdentity.mockResolvedValue({
         github: { username: 'jsonuser', id: 111, avatarUrl: '' },
         publicKey: {} as JsonWebKey,
         fingerprint: 'json456def789',
         registeredAt: '2025-01-05T00:00:00Z',
       })

       await initCommand(['--json'])

       expect(mockStartDeviceFlow).toHaveBeenCalled()
       const output = vi.mocked(console.log).mock.calls[0]?.[0] as string
       const parsed = JSON.parse(output)
       expect(parsed.username).toBe('jsonuser')
       expect(parsed.fingerprint).toBe('json456def789')
       expect(parsed.registeredAt).toBe('2025-01-05T00:00:00Z')
     })
   })
})
