import type { CryptoKey } from 'jose'

export interface AgentCredIdentity {
  github: {
    username: string
    id: number
    avatarUrl: string
  }
  publicKey: JsonWebKey
  fingerprint: string
  registeredAt: string
}

export interface AgentCredEnvelope {
  agentcred: {
    v: '1.0'
    jws: string
    github: string
    agent: string
  }
  content: string
}

export interface SignOptions {
  agent?: string
  contentType?: string
}

export interface VerifyResult {
  verified: boolean
  github?: { username: string; id: number; avatarUrl: string }
  agent?: string
  signedAt?: string
  error?: string
}

export interface KeyStorage {
  save(username: string, privateKey: JsonWebKey): Promise<void>
  load(username: string): Promise<JsonWebKey | null>
  list(): Promise<string[]>
}

export interface AgentCredConfig {
  apiUrl?: string
  storage?: KeyStorage
}

export interface SignIdentity {
  privateKey: CryptoKey | Uint8Array
  github: string
}

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface DeviceFlowOptions {
  clientId?: string
  onUserCode?: (code: string, verificationUri: string) => void
}

export interface DeviceFlowResult {
  accessToken: string
  tokenType: string
}
