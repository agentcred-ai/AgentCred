import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyCommand } from '../src/commands/verify.js'

vi.mock('@agentcred-ai/sdk', () => ({
  verify: vi.fn(),
  verifyOffline: vi.fn(),
}))

vi.mock('jose', () => ({
  importJWK: vi.fn().mockResolvedValue('mock-public-key'),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

import { verify, verifyOffline } from '@agentcred-ai/sdk'
import * as fs from 'node:fs/promises'

const mockVerify = vi.mocked(verify)
const mockVerifyOffline = vi.mocked(verifyOffline)
const mockReadFile = vi.mocked(fs.readFile)

const validEnvelope = JSON.stringify({
  agentcred: { v: '1.0', jws: 'header.payload.sig', github: 'testuser', agent: 'claude' },
  content: 'hello',
})

describe('verify command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)
  })

  it('verifies envelope from file (online)', async () => {
    mockReadFile.mockResolvedValue(validEnvelope)
    mockVerify.mockResolvedValue({
      verified: true,
      github: { username: 'testuser', id: 1, avatarUrl: '' },
      agent: 'claude',
      signedAt: '2025-01-01T00:00:00.000Z',
    })

    await verifyCommand(['envelope.json'])

    expect(mockVerify).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('\u2713 Verified: @testuser (claude)'))
  })

  it('prints failure message on verification failure', async () => {
    mockReadFile.mockResolvedValue(validEnvelope)
    mockVerify.mockResolvedValue({
      verified: false,
      error: 'Public key not found',
    })

    await verifyCommand(['envelope.json'])

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('\u2717 Verification failed: Public key not found'))
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('throws on invalid JSON input', async () => {
    mockReadFile.mockResolvedValue('not json')

    await expect(verifyCommand(['bad.json'])).rejects.toThrow('Invalid JSON input')
  })

  it('requires --key with --offline', async () => {
    mockReadFile.mockResolvedValue(validEnvelope)

    await expect(verifyCommand(['envelope.json', '--offline'])).rejects.toThrow('--key <path> is required')
  })

  it('shows help with --help flag', async () => {
    await verifyCommand(['--help'])
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('agentcred verify'))
  })

  it('outputs JSON when --json flag is used (online, success)', async () => {
    mockReadFile.mockResolvedValue(validEnvelope)
    const verifyResult = {
      verified: true,
      github: { username: 'testuser', id: 1, avatarUrl: '' },
      agent: 'claude',
      signedAt: '2025-01-01T00:00:00.000Z',
    }
    mockVerify.mockResolvedValue(verifyResult)

    await verifyCommand(['envelope.json', '--json'])

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(verifyResult, null, 2))
  })

  it('outputs JSON when --json flag is used (online, failure)', async () => {
    mockReadFile.mockResolvedValue(validEnvelope)
    const verifyResult = {
      verified: false,
      error: 'Public key not found',
    }
    mockVerify.mockResolvedValue(verifyResult)

    await verifyCommand(['envelope.json', '--json'])

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(verifyResult, null, 2))
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('outputs JSON when --json flag is used (offline, success)', async () => {
    mockReadFile.mockImplementation(async (filePath: any) => {
      if (String(filePath) === 'envelope.json') return validEnvelope
      // key file
      return JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: 'test-public' })
    })
    const verifyResult = {
      verified: true,
      github: { username: 'testuser', id: 1, avatarUrl: '' },
      agent: 'claude',
      signedAt: '2025-01-01T00:00:00.000Z',
    }
    mockVerifyOffline.mockResolvedValue(verifyResult)

    await verifyCommand(['envelope.json', '--offline', '--key', 'key.jwk', '--json'])

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(verifyResult, null, 2))
  })
})
