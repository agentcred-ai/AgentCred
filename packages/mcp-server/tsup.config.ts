import { defineConfig } from 'tsup'
import pkg from './package.json'


export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  define: {
    'PKG_VERSION': JSON.stringify(pkg.version)
  }
})
