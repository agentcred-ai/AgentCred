import { execSync } from 'child_process'
import { DeviceCodeResponse, DeviceFlowOptions, DeviceFlowResult } from './types.js'

export const AGENTCRED_CLIENT_ID = process.env.AGENTCRED_CLIENT_ID ?? 'Ov23lilcYBamYnpi7qNb'

export async function requestDeviceCode(clientId?: string): Promise<DeviceCodeResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `client_id=${clientId ?? AGENTCRED_CLIENT_ID}`
  })
  if (!response.ok) throw new Error('Failed to request device code')
  return await response.json() as DeviceCodeResponse
}

export async function pollForAccessToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  clientId?: string
): Promise<DeviceFlowResult> {
  const cid = clientId ?? AGENTCRED_CLIENT_ID
  const startTime = Date.now()
  let pollInterval = interval

  while (true) {
    const elapsed = (Date.now() - startTime) / 1000
    if (elapsed >= expiresIn) {
      throw new Error('Device code expired')
    }

    await sleep(pollInterval * 1000)

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `client_id=${cid}&device_code=${deviceCode}&grant_type=urn:ietf:params:oauth:grant-type:device_code`
    })
    if (!response.ok) throw new Error('Failed to poll for access token')

    const data = await response.json() as Record<string, string>

    if (data.error) {
      switch (data.error) {
        case 'authorization_pending':
          continue
        case 'slow_down':
          pollInterval += 5
          continue
        case 'expired_token':
          throw new Error('Device code expired')
        case 'access_denied':
          throw new Error('User denied authorization')
        default:
          throw new Error(`OAuth error: ${data.error}`)
      }
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type
    }
  }
}

export async function startDeviceFlow(options?: DeviceFlowOptions): Promise<string> {
  const { device_code, user_code, verification_uri, expires_in, interval } =
    await requestDeviceCode(options?.clientId)

  if (options?.onUserCode) {
    options.onUserCode(user_code, verification_uri)
  } else {
    console.log(`\nOpen ${verification_uri} and enter code: ${user_code}\n`)
  }

  tryOpenBrowser(verification_uri)

  const result = await pollForAccessToken(device_code, interval, expires_in, options?.clientId)
  return result.accessToken
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function tryOpenBrowser(url: string): void {
  try {
    const platform = process.platform
    if (platform === 'darwin') {
      execSync(`open ${url}`)
    } else if (platform === 'linux') {
      execSync(`xdg-open ${url}`)
    } else if (platform === 'win32') {
      execSync(`start ${url}`)
    }
  } catch {
    // Fail silently — user can open URL manually
  }
}
