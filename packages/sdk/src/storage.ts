import { KeyStorage } from './types.js'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

export class MemoryKeyStorage implements KeyStorage {
  private keys = new Map<string, JsonWebKey>()
  
  async save(username: string, privateKey: JsonWebKey): Promise<void> {
    this.keys.set(username, privateKey)
  }
  
  async load(username: string): Promise<JsonWebKey | null> {
    return this.keys.get(username) ?? null
  }
  
  async list(): Promise<string[]> {
    return Array.from(this.keys.keys())
  }
}

export class FileSystemKeyStorage implements KeyStorage {
  private keyDir: string
  
  constructor(keyDir?: string) {
    const defaultKeyDir = process.env.AGENTCRED_HOME 
      ? path.join(process.env.AGENTCRED_HOME, 'keys')
      : path.join(os.homedir(), '.agentcred', 'keys')
    this.keyDir = keyDir ?? defaultKeyDir
  }
  
  async save(username: string, privateKey: JsonWebKey): Promise<void> {
    // FIX 2: Path traversal protection - validate username format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
      throw new Error('Invalid username format')
    }

    await fs.mkdir(this.keyDir, { recursive: true, mode: 0o700 })
    const keyPath = path.join(this.keyDir, `${username}.jwk`)
    
    // FIX 2: Path traversal protection - verify path containment
    const resolved = path.resolve(keyPath)
    if (!resolved.startsWith(path.resolve(this.keyDir) + path.sep)) {
      throw new Error('Invalid key path')
    }

    // FIX 1: Private key file permissions
    await fs.writeFile(keyPath, JSON.stringify(privateKey, null, 2), { mode: 0o600 })
  }
  
  async load(username: string): Promise<JsonWebKey | null> {
    // FIX 2: Path traversal protection - validate username format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
      throw new Error('Invalid username format')
    }

    try {
      const keyPath = path.join(this.keyDir, `${username}.jwk`)
      
      // FIX 2: Path traversal protection - verify path containment
      const resolved = path.resolve(keyPath)
      if (!resolved.startsWith(path.resolve(this.keyDir) + path.sep)) {
        throw new Error('Invalid key path')
      }

      const data = await fs.readFile(keyPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // Return null for file not found, but re-throw validation errors
      if (error instanceof Error && (error.message === 'Invalid username format' || error.message === 'Invalid key path')) {
        throw error
      }
      return null
    }
  }
  
  async list(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.keyDir)
      return files.filter(f => f.endsWith('.jwk')).map(f => f.replace('.jwk', ''))
    } catch {
      return []
    }
  }
}

export function createDefaultStorage(): KeyStorage {
  if (typeof window !== 'undefined') {
    return new MemoryKeyStorage()
  }
  return new FileSystemKeyStorage()
}
