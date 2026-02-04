import { describe, it, expect, beforeEach } from 'vitest'
import { signWithHTML } from '../src/sign-html.js'
import { generateKeyPair } from 'jose'

describe('signWithHTML', () => {
  let privateKey: CryptoKey

  beforeEach(async () => {
    const keyPair = await generateKeyPair('EdDSA', { extractable: true })
    privateKey = keyPair.privateKey
  })

  it('should produce HTML with data-agentcred attribute', async () => {
    const html = await signWithHTML('Hello world', { privateKey, github: 'alice' })
    
    expect(html).toMatch(/^<span data-agentcred="[A-Za-z0-9+/=]+"/)
    expect(html).toContain('Hello world')
    expect(html).toMatch(/<\/span>$/)
  })

  it('should use span as default wrapper', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' })
    
    expect(html.startsWith('<span ')).toBe(true)
    expect(html.endsWith('</span>')).toBe(true)
  })

  it('should support div wrapper', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' }, { wrapperTag: 'div' })
    
    expect(html.startsWith('<div ')).toBe(true)
    expect(html.endsWith('</div>')).toBe(true)
  })

  it('should support p wrapper', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' }, { wrapperTag: 'p' })
    
    expect(html.startsWith('<p ')).toBe(true)
    expect(html.endsWith('</p>')).toBe(true)
  })

  it('should add className when provided', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' }, { className: 'my-class' })
    
    expect(html).toContain('class="my-class"')
  })

  it('should escape HTML in content to prevent XSS', async () => {
    const html = await signWithHTML('<script>alert(1)</script>', { privateKey, github: 'alice' })
    
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should escape closing tags to prevent injection', async () => {
    const html = await signWithHTML('</span><div>inject</div>', { privateKey, github: 'alice' })
    
    const spanMatches = html.match(/<\/span>/g) || []
    expect(spanMatches.length).toBe(1)
  })

  it('should escape quotes to prevent attribute injection', async () => {
    const html = await signWithHTML('test" onclick="alert(1)', { privateKey, github: 'alice' })
    
    expect(html).toContain('&quot;')
    const tagPart = html.split('>')[0]
    expect(tagPart).not.toContain('onclick')
  })

  it('should escape className to prevent XSS', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' }, { className: 'test" onclick="alert(1)' })
    
    expect(html).toContain('class="test&quot;')
    expect(html).toContain('&quot;alert(1)')
  })

  it('should encode agentcred metadata as valid base64', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' }, { agent: 'my-bot' })
    
    const match = html.match(/data-agentcred="([^"]+)"/)
    expect(match).not.toBeNull()
    
    const decoded = JSON.parse(Buffer.from(match![1], 'base64').toString('utf-8'))
    expect(decoded.v).toBe('1.0')
    expect(decoded.jws).toMatch(/^eyJ/)
    expect(decoded.github).toBe('alice')
    expect(decoded.agent).toBe('my-bot')
  })

  it('should pass through agent option to sign()', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' }, { agent: 'custom-agent' })
    
    const match = html.match(/data-agentcred="([^"]+)"/)
    const decoded = JSON.parse(Buffer.from(match![1], 'base64').toString('utf-8'))
    expect(decoded.agent).toBe('custom-agent')
  })

  it('should use default agent when not specified', async () => {
    const html = await signWithHTML('Test', { privateKey, github: 'alice' })
    
    const match = html.match(/data-agentcred="([^"]+)"/)
    const decoded = JSON.parse(Buffer.from(match![1], 'base64').toString('utf-8'))
    expect(decoded.agent).toBe('default')
  })
})
