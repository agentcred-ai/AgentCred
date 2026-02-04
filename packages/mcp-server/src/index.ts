#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerTools } from './tools.js'
import { registerResources } from './resources.js'
import { realpathSync } from 'node:fs'

declare const PKG_VERSION: string
export const version: string = PKG_VERSION

export function createServer(): Server {
  const server = new Server(
    { name: 'agentcred', version },
    { capabilities: { tools: {}, resources: {} } }
  )

  registerTools(server)
  registerResources(server)

  return server
}

export { registerTools } from './tools.js'
export { registerResources } from './resources.js'

async function main(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

const mainPath = process.argv[1] ? realpathSync(process.argv[1]) : ''
const isMainModule = Boolean(mainPath) && (
  mainPath.endsWith('/dist/index.js') ||
  mainPath.endsWith('/dist/index.cjs') ||
  mainPath.endsWith('/src/index.ts') ||
  mainPath.endsWith('/agentcred-mcp')
)

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
