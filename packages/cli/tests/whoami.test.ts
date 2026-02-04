import { describe, it, expect, vi, beforeEach } from 'vitest'
import { whoamiCommand } from '../src/commands/whoami.js'

vi.mock('@agentcred-ai/sdk', () => ({
  FileSystemKeyStorage: vi.fn().mockImplementation(() => ({
    list: vi.fn(),
    load: vi.fn(),
    save: vi.fn(),
  })),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

import { FileSystemKeyStorage } from '@agentcred-ai/sdk'
import * as fs from 'node:fs/promises'

const mockReadFile = vi.mocked(fs.readFile)

describe('whoami command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows identity when configured', async () => {
    const mockStorageInstance = { list: vi.fn().mockResolvedValue(['testuser']), load: vi.fn(), save: vi.fn() }
    vi.mocked(FileSystemKeyStorage).mockImplementation(() => mockStorageInstance as unknown as InstanceType<typeof FileSystemKeyStorage>)

    const mockJWK = { kty: 'OKP', crv: 'Ed25519', x: 'test-public', d: 'test-private' }
    mockReadFile.mockResolvedValue(JSON.stringify(mockJWK))

    await whoamiCommand([])

    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/You are @testuser \(fingerprint: [a-f0-9]+\)/))
  })

  it('errors when no identity found', async () => {
    const mockStorageInstance = { list: vi.fn().mockResolvedValue([]), load: vi.fn(), save: vi.fn() }
    vi.mocked(FileSystemKeyStorage).mockImplementation(() => mockStorageInstance as unknown as InstanceType<typeof FileSystemKeyStorage>)

    await expect(whoamiCommand([])).rejects.toThrow("No identity configured. Run 'agentcred init' first.")
  })

  it('shows help with --help flag', async () => {
    await whoamiCommand(['--help'])
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('agentcred whoami'))
  })

  it('outputs JSON when --json flag is used', async () => {
    const mockStorageInstance = { list: vi.fn().mockResolvedValue(['testuser']), load: vi.fn(), save: vi.fn() }
    vi.mocked(FileSystemKeyStorage).mockImplementation(() => mockStorageInstance as unknown as InstanceType<typeof FileSystemKeyStorage>)

    const mockJWK = { kty: 'OKP', crv: 'Ed25519', x: 'test-public', d: 'test-private' }
    mockReadFile.mockResolvedValue(JSON.stringify(mockJWK))

    await whoamiCommand(['--json'])

    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string
    const parsed = JSON.parse(output)
    expect(parsed.username).toBe('testuser')
    expect(parsed.fingerprint).toMatch(/^[a-f0-9]{16}$/)
    expect(parsed.keyPath).toContain('testuser.jwk')
  })
})
