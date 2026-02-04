import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { loadIdentity } from '@agentcred-ai/sdk'
import { getStorage, getCurrentUsername } from './tools.js'

const RESOURCES = [
  {
    uri: 'agentcred://identity',
    name: 'Current Identity',
    description: 'The current AgentCred identity information as JSON',
    mimeType: 'application/json',
  },
  {
    uri: 'agentcred://spec',
    name: 'AgentCred Specification',
    description: 'Link to the AgentCred protocol specification',
    mimeType: 'text/plain',
  },
]

export function registerResources(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES,
  }))

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params

    switch (uri) {
      case 'agentcred://identity': {
        const username = getCurrentUsername()
        if (!username) {
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'No identity configured' }),
            }],
          }
        }

        const loaded = await loadIdentity(username, { storage: getStorage() })
        if (!loaded) {
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Failed to load identity' }),
            }],
          }
        }

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(loaded.identity, null, 2),
          }],
        }
      }

      case 'agentcred://spec':
        return {
          contents: [{
            uri,
            mimeType: 'text/plain',
            text: 'AgentCred Protocol Specification: https://github.com/agentcred/spec\n\nAgentCred enables AI agents to cryptographically sign their outputs using Ed25519 keys tied to GitHub identities.',
          }],
        }

      default:
        throw new Error(`Unknown resource: ${uri}`)
    }
  })
}
