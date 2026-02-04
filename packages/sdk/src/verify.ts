import { compactVerify, importJWK } from 'jose'
import { createHash, timingSafeEqual } from 'crypto'
import { AgentCredEnvelope, VerifyResult, AgentCredConfig } from './types.js'
import { resolvePublicKey } from './identity.js'

export async function verify(
  envelope: AgentCredEnvelope,
  config?: AgentCredConfig
): Promise<VerifyResult> {
  try {
    const { github } = envelope.agentcred
    
    const publicJWK = await resolvePublicKey(github, config)
    if (!publicJWK) {
      return { verified: false, error: 'Public key not found' }
    }
    
    const publicKey = await importJWK(publicJWK, 'EdDSA')
    return await verifyOffline(envelope, publicKey)
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}

export async function verifyOffline(
  envelope: AgentCredEnvelope,
  publicKey: any
): Promise<VerifyResult> {
  try {
    const { payload, protectedHeader } = await compactVerify(envelope.agentcred.jws, publicKey)
    if (protectedHeader.alg !== 'EdDSA') {
      return { verified: false, error: 'Invalid algorithm' }
    }
    const claims = JSON.parse(new TextDecoder().decode(payload))
    
    const actualHash = createHash('sha256').update(envelope.content).digest('hex')
    const expectedHash = claims.content_hash.replace('sha256:', '')
    if (actualHash.length !== expectedHash.length || !timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash))) {
      return { verified: false, error: 'Content hash mismatch' }
    }
    
    const expectedIss = `${envelope.agentcred.github}@agentcred`
    if (claims.iss !== expectedIss) {
      return { verified: false, error: 'Issuer mismatch' }
    }
    
    const now = Math.floor(Date.now() / 1000)
    const timeDiff = Math.abs(now - claims.iat)
    if (timeDiff > 86400) {
      return { verified: false, error: 'Timestamp outside valid window' }
    }
    
    return {
      verified: true,
      github: {
        username: envelope.agentcred.github,
        id: 0,
        avatarUrl: ''
      },
      agent: claims.sub,
      signedAt: new Date(claims.iat * 1000).toISOString()
    }
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}
