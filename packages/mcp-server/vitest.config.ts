import { defineConfig } from 'vitest/config'
import pkg from './package.json'


export default defineConfig({
  test: {
    globals: true,
  },
  define: {
    'PKG_VERSION': JSON.stringify(pkg.version)
  }
})
