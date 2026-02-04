import { describe, it, expect } from 'vitest'
import * as agentcred from '../src/index.js'

describe('agentcred exports', () => {
  it('should export all expected functions', () => {
    expect(agentcred.sign).toBeDefined()
    expect(agentcred.verify).toBeDefined()
    expect(agentcred.verifyOffline).toBeDefined()
    expect(agentcred.createIdentity).toBeDefined()
    expect(agentcred.loadIdentity).toBeDefined()
    expect(agentcred.resolvePublicKey).toBeDefined()
    expect(agentcred.MemoryKeyStorage).toBeDefined()
    expect(agentcred.FileSystemKeyStorage).toBeDefined()
    expect(agentcred.createDefaultStorage).toBeDefined()
  })

  it('should export functions as callable', () => {
    expect(typeof agentcred.sign).toBe('function')
    expect(typeof agentcred.verify).toBe('function')
    expect(typeof agentcred.verifyOffline).toBe('function')
    expect(typeof agentcred.createIdentity).toBe('function')
    expect(typeof agentcred.loadIdentity).toBe('function')
    expect(typeof agentcred.resolvePublicKey).toBe('function')
  })

  it('should export storage classes', () => {
    expect(agentcred.MemoryKeyStorage).toBeDefined()
    expect(agentcred.FileSystemKeyStorage).toBeDefined()
    expect(typeof agentcred.createDefaultStorage).toBe('function')
  })
})
