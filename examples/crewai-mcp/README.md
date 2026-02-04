# CrewAI + AgentCred MCP Integration

Use AgentCred's MCP server as tools in CrewAI agents. Your crew members get cryptographic signing capabilities via the Model Context Protocol.

## Prerequisites

- **Node.js 18+** (for the AgentCred MCP server)
- **Python 3.10+**
- **GitHub token** (`ghp_...`) with no special scopes required
- **GitHub username** (for signing in the MCP server)

## Installation

```bash
pip install crewai crewai-tools
```

## Quick Start

```python
import os

from crewai_tools import MCPServerAdapter
from mcp import StdioServerParameters

"""
Before running, initialize your identity once:
  npx @agentcred-ai/cli init --token ghp_your_token
"""

server_params = StdioServerParameters(
    command="npx",
    args=["-y", "@agentcred-ai/mcp-server"],
    env={
        "GITHUB_TOKEN": os.environ["GITHUB_TOKEN"],
        "GITHUB_USERNAME": os.environ["GITHUB_USERNAME"],
    },
)

with MCPServerAdapter(
    server_params,
    "agentcred_sign",
    "agentcred_verify",
    "agentcred_whoami",
) as tools:
    sign_tool = next(tool for tool in tools if tool.name == "agentcred_sign")
    result = sign_tool.run(content="Q4 revenue increased by 15% year-over-year")
    print(result)
```

Note: This example calls the MCP tool directly to keep it runnable without LLM tool-calling constraints. You can still pass `tools` into CrewAI agents as usual.

## Available AgentCred Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `agentcred_init` | Initialize identity (links GitHub to Ed25519 keypair) | `github_token` (optional) |
| `agentcred_sign` | Sign content and return verifiable envelope | `content` (required), `agent` (optional) |
| `agentcred_verify` | Verify an AgentCred envelope | `envelope` (required, JSON string) |
| `agentcred_whoami` | Check current identity | (none) |

## How It Works

1. `MCPServerAdapter` starts the AgentCred MCP server as a subprocess
2. CrewAI automatically discovers the 4 tools via MCP
3. Agents can call `agentcred_sign` to sign any content
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
