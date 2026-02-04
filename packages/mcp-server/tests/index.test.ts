import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { version } from '../src/index'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

describe('package', () => {
  it('exports version', () => {
    expect(version).toBeDefined()
    expect(version).toBe(pkg.version)
  })
})
