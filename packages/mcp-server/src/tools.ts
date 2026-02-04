import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import {
  createIdentity,
  loadIdentity,
  sign,
  verify,
  startDeviceFlow,
  createDefaultStorage,
  type AgentCredEnvelope,
  type AgentCredConfig,
  type KeyStorage,
} from '@agentcred-ai/sdk'

const storage = createDefaultStorage()

function getConfig(): AgentCredConfig {
  return { storage }
}

let currentUsername: string | null = null

export function getStorage(): KeyStorage {
  return storage
}

function resolveCurrentUsername(): string | null {
  if (!currentUsername && process.env.GITHUB_USERNAME) {
    currentUsername = process.env.GITHUB_USERNAME
  }
  return currentUsername
}

export function getCurrentUsername(): string | null {
  return resolveCurrentUsername()
}

export function setCurrentUsername(username: string | null): void {
  currentUsername = username
}

const TOOLS = [
  {
    name: 'agentcred_init',
    description: 'Initialize an AgentCred identity. Authenticates with GitHub via OAuth Device Flow (opens browser) or Personal Access Token.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        github_token: {
          type: 'string',
          description: 'Optional GitHub personal access token (if not provided, uses OAuth Device Flow)',
        },
      },
    },
  },
   {
     name: 'agentcred_sign',
     description: 'Sign content with the current AgentCred identity, producing a verifiable envelope. For web content with invisible signatures, use signWithHTML() from the SDK directly.',
     inputSchema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'The content to sign',
        },
        agent: {
          type: 'string',
          description: 'Optional agent identifier (defaults to "default")',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'agentcred_verify',
    description: 'Verify an AgentCred envelope to check its authenticity and integrity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        envelope: {
          type: 'string',
          description: 'JSON string of the AgentCredEnvelope to verify',
        },
      },
      required: ['envelope'],
    },
  },
  {
    name: 'agentcred_whoami',
    description: 'Show the current AgentCred identity information.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
]

async function handleInit(args: { github_token?: string }): Promise<CallToolResult> {
  let githubToken: string
  const envToken = process.env.GITHUB_TOKEN
  
  if (args.github_token) {
    // Use provided PAT
    githubToken = args.github_token
  } else if (envToken) {
    // Use token from environment
    githubToken = envToken
  } else {
    // Use OAuth Device Flow
    try {
      githubToken = await startDeviceFlow({
        onUserCode: (code, verificationUri) => {
          // This callback is called before polling starts
          // We can't return early, so we rely on the console.log in startDeviceFlow
          // The message will appear in MCP server logs, but not in Claude Desktop
          // TODO: Consider returning this as a separate tool response or using MCP progress notifications
        }
      })
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `OAuth authentication failed: ${error instanceof Error ? error.message : String(error)}\n\nTo use Personal Access Token instead, provide github_token parameter.`,
        }],
        isError: true,
      }
    }
  }
  
  const identity = await createIdentity(githubToken, getConfig())
  currentUsername = identity.github.username
  return {
    content: [{
      type: 'text',
      text: `Identity initialized for ${identity.github.username}\nFingerprint: ${identity.fingerprint}\nRegistered at: ${identity.registeredAt}`,
    }],
  }
}

async function handleSign(args: { content: string; agent?: string }): Promise<CallToolResult> {
  let username = resolveCurrentUsername()
  if (!username) {
    const knownUsers = await storage.list()
    if (knownUsers.length === 1) {
      username = knownUsers[0]
      currentUsername = username
    }
  }
  if (!username) {
    return {
      content: [{ type: 'text', text: 'Error: No identity configured. Run agentcred_init first.' }],
      isError: true,
    }
  }

  const loaded = await loadIdentity(username, getConfig())
  if (!loaded) {
    return {
      content: [{ type: 'text', text: 'Error: Failed to load identity. Run agentcred_init first.' }],
      isError: true,
    }
  }

  const signIdentity = { privateKey: loaded.privateKey, github: username }
  const envelope = await sign(args.content, signIdentity, { agent: args.agent })
  return {
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
  }
}

async function handleVerify(args: { envelope: string }): Promise<CallToolResult> {
  let envelope: AgentCredEnvelope
  try {
    envelope = JSON.parse(args.envelope) as AgentCredEnvelope
  } catch {
    return {
      content: [{ type: 'text', text: 'Error: Invalid JSON envelope' }],
      isError: true,
    }
  }

  const result = await verify(envelope)
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  }
}

async function handleWhoami(): Promise<CallToolResult> {
  let username = resolveCurrentUsername()
  if (!username) {
    const knownUsers = await storage.list()
    if (knownUsers.length === 1) {
      username = knownUsers[0]
      currentUsername = username
    }
  }
  if (!username) {
    return {
      content: [{ type: 'text', text: 'No identity configured. Run agentcred_init to set up.' }],
    }
  }

  const loaded = await loadIdentity(username, getConfig())
  if (!loaded) {
    return {
      content: [{ type: 'text', text: 'No identity configured. Run agentcred_init to set up.' }],
    }
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(loaded.identity, null, 2),
    }],
  }
}

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name } = request.params
    const args = (request.params.arguments ?? {}) as Record<string, unknown>

    switch (name) {
      case 'agentcred_init':
        return handleInit(args as { github_token?: string })
      case 'agentcred_sign':
        return handleSign(args as { content: string; agent?: string })
      case 'agentcred_verify':
        return handleVerify(args as { envelope: string })
      case 'agentcred_whoami':
        return handleWhoami()
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  })
}
