import { generateKeyPair, exportJWK, importJWK } from 'jose'
import { AgentCredIdentity, AgentCredConfig, SignIdentity } from './types.js'
import { createDefaultStorage } from './storage.js'
import { createHash } from 'crypto'

export async function createIdentity(
  githubToken: string,
  config?: AgentCredConfig
): Promise<AgentCredIdentity> {
  const apiUrl = config?.apiUrl ?? process.env.AGENTCRED_API_URL ?? 'https://api.agentcred.dev'
  const storage = config?.storage ?? createDefaultStorage()
  
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${githubToken}` }
  })
  if (!response.ok) throw new Error('GitHub authentication failed')
  const profile = await response.json()
  
  const { publicKey, privateKey } = await generateKeyPair('EdDSA', { extractable: true })
  const publicJWK = await exportJWK(publicKey)
  const privateJWK = await exportJWK(privateKey)
  
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(publicJWK))
    .digest('hex')
  
  const registerResponse = await fetch(`${apiUrl}/v1/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${githubToken}`
    },
    body: JSON.stringify({ public_key: publicJWK })
  })
  if (!registerResponse.ok) throw new Error('Key registration failed')
  const registration = await registerResponse.json()
  
  await storage.save(profile.login, privateJWK)
  
  return {
    github: {
      username: profile.login,
      id: profile.id,
      avatarUrl: profile.avatar_url
    },
    publicKey: publicJWK,
    fingerprint,
    registeredAt: registration.registered_at
  }
}

export async function loadIdentity(
  githubUsername: string,
  config?: AgentCredConfig
): Promise<{ identity: AgentCredIdentity; privateKey: CryptoKey | Uint8Array } | null> {
  const apiUrl = config?.apiUrl ?? process.env.AGENTCRED_API_URL ?? 'https://api.agentcred.dev'
  const storage = config?.storage ?? createDefaultStorage()
  
  const privateJWK = await storage.load(githubUsername)
  if (!privateJWK) return null
  
  const publicJWK = await resolvePublicKey(githubUsername, config)
  if (!publicJWK) return null
  
  const privateKey = await importJWK(privateJWK, 'EdDSA')
  
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(publicJWK))
    .digest('hex')
  
  return {
    identity: {
      github: {
        username: githubUsername,
        id: 0,
        avatarUrl: ''
      },
      publicKey: publicJWK,
      fingerprint,
      registeredAt: new Date().toISOString()
    },
    privateKey
  }
}

export async function resolvePublicKey(
  githubUsername: string,
  config?: AgentCredConfig
): Promise<JsonWebKey | null> {
  const apiUrl = config?.apiUrl ?? process.env.AGENTCRED_API_URL ?? 'https://api.agentcred.dev'
  
  try {
    const response = await fetch(`${apiUrl}/v1/keys/${githubUsername}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.public_key
  } catch {
    return null
  }
}
