import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signCommand } from '../src/commands/sign.js'

vi.mock('@agentcred-ai/sdk', () => ({
  loadIdentity: vi.fn(),
  sign: vi.fn(),
  FileSystemKeyStorage: vi.fn().mockImplementation(() => ({
    list: vi.fn(),
    load: vi.fn(),
    save: vi.fn(),
  })),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

import { loadIdentity, sign, FileSystemKeyStorage } from '@agentcred-ai/sdk'
import * as fs from 'node:fs/promises'

const mockLoadIdentity = vi.mocked(loadIdentity)
const mockSign = vi.mocked(sign)
const mockReadFile = vi.mocked(fs.readFile)

describe('sign command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('signs content from file argument', async () => {
    const mockStorageInstance = { list: vi.fn().mockResolvedValue(['testuser']), load: vi.fn(), save: vi.fn() }
    vi.mocked(FileSystemKeyStorage).mockImplementation(() => mockStorageInstance as unknown as InstanceType<typeof FileSystemKeyStorage>)

    mockReadFile.mockResolvedValue('hello world')
    mockLoadIdentity.mockResolvedValue({
      identity: {
        github: { username: 'testuser', id: 1, avatarUrl: '' },
        publicKey: {} as JsonWebKey,
        fingerprint: 'abc',
        registeredAt: '2025-01-01',
      },
      privateKey: new Uint8Array(32),
    })
    mockSign.mockResolvedValue({
      agentcred: { v: '1.0', jws: 'test.jws.sig', github: 'testuser', agent: 'default' },
      content: 'hello world',
    })

    await signCommand(['test.txt'])

    expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8')
    expect(mockSign).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"agentcred"'))
  })

  it('errors when no identity found', async () => {
    const mockStorageInstance = { list: vi.fn().mockResolvedValue([]), load: vi.fn(), save: vi.fn() }
    vi.mocked(FileSystemKeyStorage).mockImplementation(() => mockStorageInstance as unknown as InstanceType<typeof FileSystemKeyStorage>)

    mockReadFile.mockResolvedValue('content')

    await expect(signCommand(['file.txt'])).rejects.toThrow("No identity found. Run 'agentcred init' first.")
  })

  it('passes --agent flag to sign', async () => {
    const mockStorageInstance = { list: vi.fn().mockResolvedValue(['testuser']), load: vi.fn(), save: vi.fn() }
    vi.mocked(FileSystemKeyStorage).mockImplementation(() => mockStorageInstance as unknown as InstanceType<typeof FileSystemKeyStorage>)

    mockReadFile.mockResolvedValue('content')
    mockLoadIdentity.mockResolvedValue({
      identity: {
        github: { username: 'testuser', id: 1, avatarUrl: '' },
        publicKey: {} as JsonWebKey,
        fingerprint: 'abc',
        registeredAt: '2025-01-01',
      },
      privateKey: new Uint8Array(32),
    })
    mockSign.mockResolvedValue({
      agentcred: { v: '1.0', jws: 'sig', github: 'testuser', agent: 'claude' },
      content: 'content',
    })

    await signCommand(['file.txt', '--agent', 'claude'])

    expect(mockSign).toHaveBeenCalledWith(
      'content',
      expect.objectContaining({ github: 'testuser' }),
      expect.objectContaining({ agent: 'claude' })
    )
  })

  it('shows help with --help flag', async () => {
    await signCommand(['--help'])
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('agentcred sign'))
  })
})
