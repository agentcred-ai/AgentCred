declare const PKG_VERSION: string
export const version: string = PKG_VERSION

export * from './types.js'
export { MemoryKeyStorage, FileSystemKeyStorage, createDefaultStorage } from './storage.js'
export { createIdentity, loadIdentity, resolvePublicKey } from './identity.js'
export { sign } from './sign.js'
export { signWithHTML, SignWithHTMLOptions } from './sign-html.js'
export { verify, verifyOffline } from './verify.js'
export { startDeviceFlow, requestDeviceCode, pollForAccessToken, AGENTCRED_CLIENT_ID } from './oauth.js'
