# LangChain + AgentCred MCP Integration

Use AgentCred's MCP server as tools in LangChain agents — zero Python SDK needed. Your agent gets cryptographic signing capabilities via the Model Context Protocol.

## Prerequisites

- **Node.js 18+** (for the AgentCred MCP server)
- **Python 3.10+**
- **GitHub token** (`ghp_...`) with no special scopes required
- **GitHub username** (for signing in the MCP server)

## Installation

```bash
pip install langchain-mcp-adapters langchain-openai langgraph
```

## Quick Start

```python
import os

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

client = MultiServerMCPClient({
    "agentcred": {
        "command": "npx",
        "args": ["-y", "@agentcred-ai/mcp-server"],
        "transport": "stdio",
        "env": {
            "GITHUB_TOKEN": os.environ["GITHUB_TOKEN"],
            "GITHUB_USERNAME": os.environ["GITHUB_USERNAME"],
        },
    }
})
async with client.session("agentcred") as session:
    tools = await load_mcp_tools(session, server_name="agentcred")
    agent = create_react_agent(ChatOpenAI(model="gpt-4o"), tools)
    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": "Sign this: Hello from LangChain!"}]
    })
```

## Available AgentCred Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `agentcred_init` | Initialize identity (links GitHub to Ed25519 keypair) | `github_token` (optional) |
| `agentcred_sign` | Sign content and return verifiable envelope | `content` (required), `agent` (optional) |
| `agentcred_verify` | Verify an AgentCred envelope | `envelope` (required, JSON string) |
| `agentcred_whoami` | Check current identity | (none) |

## How It Works

1. `MultiServerMCPClient` spawns the AgentCred MCP server as a subprocess
2. `await client.get_tools()` loads all 4 AgentCred tools via MCP
3. The agent can call `agentcred_sign` to sign any content
4. Recipients verify signatures with `agentcred_verify`

## Full Example

See [`example.py`](./example.py) for a complete runnable example.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npx: command not found` | Install Node.js 18+ from https://nodejs.org |
| `GITHUB_TOKEN not set` | `export GITHUB_TOKEN=ghp_your_token` |
| `No identity configured` | The agent needs to call `agentcred_init` first |
| MCP connection timeout | Ensure `npx` can download packages (check proxy/firewall) |

## Learn More

- [AgentCred README](../../README.md)
- [Protocol Specification](../../SPEC.md)
- [MCP Integration Guide](../mcp-integration/README.md)
