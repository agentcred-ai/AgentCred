import { CompactSign } from 'jose'
import { createHash, randomUUID } from 'crypto'
import { AgentCredEnvelope, SignOptions, SignIdentity } from './types.js'

export async function sign(
  content: string,
  identity: SignIdentity,
  options?: SignOptions
): Promise<AgentCredEnvelope> {
  const agent = options?.agent ?? 'default'
  const contentType = options?.contentType ?? 'text/plain'
  
  const contentHash = createHash('sha256').update(content).digest('hex')
  
  const payload = {
    iss: `${identity.github}@agentcred`,
    sub: agent,
    iat: Math.floor(Date.now() / 1000),
    content_hash: `sha256:${contentHash}`,
    content_type: contentType,
    nonce: randomUUID()
  }
  
  const jws = await new CompactSign(
    new TextEncoder().encode(JSON.stringify(payload))
  )
    .setProtectedHeader({
      alg: 'EdDSA',
      typ: 'agentcred+jwt',
      kid: `${identity.github}@agentcred`
    })
    .sign(identity.privateKey)
  
  return {
    agentcred: {
      v: '1.0',
      jws,
      github: identity.github,
      agent
    },
    content
  }
}
