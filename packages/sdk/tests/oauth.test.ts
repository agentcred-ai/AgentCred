import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.stubGlobal('fetch', vi.fn())

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

import { requestDeviceCode, pollForAccessToken, startDeviceFlow, AGENTCRED_CLIENT_ID } from '../src/oauth.js'
import { execSync } from 'child_process'

describe('requestDeviceCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return device code response on success', async () => {
    const mockResponse = {
      device_code: 'device-123',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 5
    }
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await requestDeviceCode()

    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `client_id=${AGENTCRED_CLIENT_ID}`
    })
  })

  it('should throw on GitHub error response', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }))

    await expect(requestDeviceCode()).rejects.toThrow('Failed to request device code')
  })
})

describe('pollForAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return access token after authorization_pending then success', async () => {
    const mockFetch = vi.mocked(global.fetch)

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'authorization_pending' }), { status: 200 })
    )
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'gho_abc123', token_type: 'bearer' }), { status: 200 })
    )

    const pollPromise = pollForAccessToken('device-123', 1, 900)

    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)

    const result = await pollPromise
    expect(result).toEqual({ accessToken: 'gho_abc123', tokenType: 'bearer' })
  })

  it('should increase interval by 5s on slow_down', async () => {
    const mockFetch = vi.mocked(global.fetch)

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'slow_down' }), { status: 200 })
    )
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'gho_abc123', token_type: 'bearer' }), { status: 200 })
    )

    const pollPromise = pollForAccessToken('device-123', 1, 900)

    await vi.advanceTimersByTimeAsync(1000)
    // 6s = original 1s interval + 5s slow_down penalty
    await vi.advanceTimersByTimeAsync(6000)

    const result = await pollPromise
    expect(result).toEqual({ accessToken: 'gho_abc123', tokenType: 'bearer' })
  })

  it('should throw on expired_token error', async () => {
    const mockFetch = vi.mocked(global.fetch)

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'expired_token' }), { status: 200 })
    )

    const pollPromise = pollForAccessToken('device-123', 1, 900).catch((e: Error) => e)

    await vi.advanceTimersByTimeAsync(1000)

    const error = await pollPromise
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Device code expired')
  })

  it('should throw on access_denied error', async () => {
    const mockFetch = vi.mocked(global.fetch)

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'access_denied' }), { status: 200 })
    )

    const pollPromise = pollForAccessToken('device-123', 1, 900).catch((e: Error) => e)

    await vi.advanceTimersByTimeAsync(1000)

    const error = await pollPromise
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('User denied authorization')
  })

  it('should throw on time expiration', async () => {
    const mockFetch = vi.mocked(global.fetch)

    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'authorization_pending' }), { status: 200 }))
    )

    const pollPromise = pollForAccessToken('device-123', 1, 3).catch((e: Error) => e)

    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)

    const error = await pollPromise
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Device code expired')
  })
})

describe('startDeviceFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should complete full device flow and return access token', async () => {
    const mockFetch = vi.mocked(global.fetch)

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        device_code: 'device-123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1
      }), { status: 200 })
    )
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'gho_token', token_type: 'bearer' }), { status: 200 })
    )

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const flowPromise = startDeviceFlow()

    await vi.advanceTimersByTimeAsync(1000)

    const token = await flowPromise
    expect(token).toBe('gho_token')

    consoleSpy.mockRestore()
  })

  it('should call onUserCode callback when provided', async () => {
    const mockFetch = vi.mocked(global.fetch)
    const onUserCode = vi.fn()

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        device_code: 'device-123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1
      }), { status: 200 })
    )
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'gho_token', token_type: 'bearer' }), { status: 200 })
    )

    const flowPromise = startDeviceFlow({ onUserCode })

    await vi.advanceTimersByTimeAsync(1000)
    await flowPromise

    expect(onUserCode).toHaveBeenCalledWith('ABCD-1234', 'https://github.com/login/device')
  })

  it('should console.log when no onUserCode callback', async () => {
    const mockFetch = vi.mocked(global.fetch)
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        device_code: 'device-123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1
      }), { status: 200 })
    )
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'gho_token', token_type: 'bearer' }), { status: 200 })
    )

    const flowPromise = startDeviceFlow()

    await vi.advanceTimersByTimeAsync(1000)
    await flowPromise

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ABCD-1234')
    )

    consoleSpy.mockRestore()
  })

  it('should handle browser open failure silently', async () => {
    const mockFetch = vi.mocked(global.fetch)
    const mockExecSync = vi.mocked(execSync)
    mockExecSync.mockImplementation(() => { throw new Error('No browser') })

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        device_code: 'device-123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1
      }), { status: 200 })
    )
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'gho_token', token_type: 'bearer' }), { status: 200 })
    )

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const flowPromise = startDeviceFlow()

    await vi.advanceTimersByTimeAsync(1000)

    const token = await flowPromise
    expect(token).toBe('gho_token')

    consoleSpy.mockRestore()
  })
})

describe('AGENTCRED_CLIENT_ID', () => {
  it('should use default client ID when env var not set', () => {
    expect(AGENTCRED_CLIENT_ID).toBe(process.env.AGENTCRED_CLIENT_ID ?? 'Ov23lilcYBamYnpi7qNb')
  })

  it('should use custom client ID when passed to requestDeviceCode', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        device_code: 'device-123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5
      }), { status: 200 })
    )

    await requestDeviceCode('custom-client-id')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://github.com/login/device/code',
      expect.objectContaining({
        body: 'client_id=custom-client-id'
      })
    )
  })
})
