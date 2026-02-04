import { sign } from './sign.js'
import { SignIdentity, SignOptions } from './types.js'

export interface SignWithHTMLOptions extends SignOptions {
  wrapperTag?: 'span' | 'div' | 'p'
  className?: string
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function signWithHTML(
  content: string,
  identity: SignIdentity,
  options?: SignWithHTMLOptions
): Promise<string> {
  const envelope = await sign(content, identity, options)
  
  const tag = options?.wrapperTag ?? 'span'
  const classAttr = options?.className ? ` class="${escapeHTML(options.className)}"` : ''
  
  const metadata = JSON.stringify(envelope.agentcred)
  const encodedMetadata = Buffer.from(metadata, 'utf-8').toString('base64')
  
  return `<${tag}${classAttr} data-agentcred="${encodedMetadata}">${escapeHTML(content)}</${tag}>`
}
