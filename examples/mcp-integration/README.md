# MCP Integration Guide

This guide explains how to integrate AgentCred into your Model Context Protocol (MCP) environment, such as Claude Desktop or any MCP-compliant client.

## Installation

To use AgentCred as an MCP server, you don't need to install it globally. You can run it directly using `npx`.

## Configuration

Add the following to your MCP configuration file:

### Claude Desktop
On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agentcred": {
      "command": "npx",
      "args": ["-y", "@agentcred-ai/mcp-server"]
    }
  }
}
```

### Other MCP Clients
Add to your MCP client's configuration file:

```json
{
  "mcpServers": {
    "agentcred": {
      "command": "npx",
      "args": ["-y", "@agentcred-ai/mcp-server"]
    }
  }
}
```

## Available Tools

Once configured, your agent will have access to the following tools:

### `agentcred_init`
Initializes your AgentCred identity. It will prompt for a GitHub token if not already configured.
- **Parameters**: `token` (optional) - Your GitHub OAuth token.

### `agentcred_sign`
Signs a piece of content and returns an AgentCred envelope.
- **Parameters**: 
  - `content`: The string content to sign.
  - `agentName` (optional): The name of the agent to include in the metadata.

### `agentcred_verify`
Verifies an AgentCred envelope and returns the verification result.
- **Parameters**: 
  - `envelope`: The full JSON envelope to verify.

### `agentcred_whoami`
Returns information about the currently configured identity.

## Available Resources

- `agentcred://identity`: Returns the public metadata of your current identity.
- `agentcred://spec`: Returns the AgentCred protocol specification.

## Usage Example

You can ask your agent:
> "Sign this message for me using AgentCred: 'This is a verified statement from my AI assistant.'"

The agent will use the `agentcred_sign` tool and provide you with a JSON envelope that you can share anywhere.
