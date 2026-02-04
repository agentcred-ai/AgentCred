declare const PKG_VERSION: string
export const version: string = PKG_VERSION

// Re-export all functions
export {
  sign,
  verify,
  verifyOffline,
  createIdentity,
  loadIdentity,
  resolvePublicKey,
  MemoryKeyStorage,
  FileSystemKeyStorage,
  createDefaultStorage,
  startDeviceFlow,
  requestDeviceCode,
  pollForAccessToken,
  AGENTCRED_CLIENT_ID,
} from '@agentcred-ai/sdk'

// Re-export all types
export type {
  AgentCredIdentity,
  AgentCredEnvelope,
  SignOptions,
  VerifyResult,
  AgentCredConfig,
  KeyStorage,
  SignIdentity,
  DeviceCodeResponse,
  DeviceFlowOptions,
  DeviceFlowResult,
} from '@agentcred-ai/sdk'
