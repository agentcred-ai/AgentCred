import { defineConfig } from 'tsup'
import pkg from './package.json'


export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [],
  external: ['jose', '@agentcred-ai/sdk'],
  define: {
    'PKG_VERSION': JSON.stringify(pkg.version)
  }
})
