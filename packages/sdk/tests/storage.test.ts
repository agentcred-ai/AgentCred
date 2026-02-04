import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryKeyStorage, FileSystemKeyStorage } from '../src/storage.js'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('MemoryKeyStorage', () => {
  let storage: MemoryKeyStorage

  beforeEach(() => {
    storage = new MemoryKeyStorage()
  })

  it('should save and load a key', async () => {
    const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
    await storage.save('alice', key)
    const loaded = await storage.load('alice')
    expect(loaded).toEqual(key)
  })

  it('should return null for non-existent key', async () => {
    const loaded = await storage.load('bob')
    expect(loaded).toBeNull()
  })

  it('should list all stored usernames', async () => {
    const key1: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test1' }
    const key2: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test2' }
    await storage.save('alice', key1)
    await storage.save('bob', key2)
    const list = await storage.list()
    expect(list).toEqual(expect.arrayContaining(['alice', 'bob']))
    expect(list).toHaveLength(2)
  })

  it('should overwrite existing key', async () => {
    const key1: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test1' }
    const key2: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test2' }
    await storage.save('alice', key1)
    await storage.save('alice', key2)
    const loaded = await storage.load('alice')
    expect(loaded).toEqual(key2)
  })
})

describe('FileSystemKeyStorage', () => {
  let storage: FileSystemKeyStorage
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentcred-test-'))
    storage = new FileSystemKeyStorage(tempDir)
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should save and load a key from filesystem', async () => {
    const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
    await storage.save('alice', key)
    const loaded = await storage.load('alice')
    expect(loaded).toEqual(key)
  })

  it('should return null for non-existent key', async () => {
    const loaded = await storage.load('bob')
    expect(loaded).toBeNull()
  })

  it('should list all stored usernames', async () => {
    const key1: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test1' }
    const key2: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test2' }
    await storage.save('alice', key1)
    await storage.save('bob', key2)
    const list = await storage.list()
    expect(list).toEqual(expect.arrayContaining(['alice', 'bob']))
    expect(list).toHaveLength(2)
  })

  it('should persist keys across instances', async () => {
    const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
    await storage.save('alice', key)

    // Create new instance with same directory
    const storage2 = new FileSystemKeyStorage(tempDir)
    const loaded = await storage2.load('alice')
    expect(loaded).toEqual(key)
  })

   it('should handle special characters in username', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await storage.save('alice-bob-123', key)
     const loaded = await storage.load('alice-bob-123')
     expect(loaded).toEqual(key)
   })

   it('should return empty list when directory does not exist', async () => {
     const nonExistentDir = path.join(tempDir, 'nonexistent')
     const storage2 = new FileSystemKeyStorage(nonExistentDir)
     const list = await storage2.list()
     expect(list).toEqual([])
   })

   // FIX 1: Private key file permissions tests
   if (process.platform !== 'win32') {
     it('should create key file with 0o600 permissions', async () => {
       const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
       await storage.save('alice', key)
       const keyPath = path.join(tempDir, 'alice.jwk')
       const stat = await fs.stat(keyPath)
       expect(stat.mode & 0o777).toBe(0o600)
     })

     it('should create key directory with 0o700 permissions', async () => {
       const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
       await storage.save('bob', key)
       const stat = await fs.stat(tempDir)
       expect(stat.mode & 0o777).toBe(0o700)
     })
   }

   // FIX 2: Path traversal protection tests
   it('should reject path traversal in save()', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await expect(storage.save('../../../etc/passwd', key)).rejects.toThrow('Invalid username format')
   })

   it('should reject path traversal in load()', async () => {
     await expect(storage.load('../../../etc/passwd')).rejects.toThrow('Invalid username format')
   })

   it('should reject empty username in save()', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await expect(storage.save('', key)).rejects.toThrow('Invalid username format')
   })

   it('should reject empty username in load()', async () => {
     await expect(storage.load('')).rejects.toThrow('Invalid username format')
   })

   it('should reject username that is too long (40 chars)', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     const longUsername = 'a'.repeat(40)
     await expect(storage.save(longUsername, key)).rejects.toThrow('Invalid username format')
   })

   it('should reject username with leading hyphen in save()', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await expect(storage.save('-leading', key)).rejects.toThrow('Invalid username format')
   })

   it('should reject username with trailing hyphen in save()', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await expect(storage.save('trailing-', key)).rejects.toThrow('Invalid username format')
   })

   it('should reject username with underscore in save()', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await expect(storage.save('under_score', key)).rejects.toThrow('Invalid username format')
   })

   it('should accept valid username with hyphen in save()', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await expect(storage.save('valid-user', key)).resolves.toBeUndefined()
     const loaded = await storage.load('valid-user')
     expect(loaded).toEqual(key)
   })

   it('should accept single character username in save()', async () => {
     const key: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' }
     await expect(storage.save('a', key)).resolves.toBeUndefined()
     const loaded = await storage.load('a')
     expect(loaded).toEqual(key)
   })

   it('should return null for non-existent valid username in load()', async () => {
     const loaded = await storage.load('valid-user')
     expect(loaded).toBeNull()
   })
})
