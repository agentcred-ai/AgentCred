<p align="center">
  <img src="assets/logo.png" alt="AgentCred" width="400" />
</p>

<h1 align="center">AgentCred</h1>

<p align="center">
  <strong>Don't trust the agent. Trust the human behind it.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcred"><img src="https://img.shields.io/npm/v/agentcred.svg" alt="npm version"></a>
  <a href="https://agentcred.dev"><img src="https://img.shields.io/badge/Website-agentcred.dev-blue" alt="Website"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Compatible-blue.svg" alt="MCP Compatible"></a>
</p>

<p align="center">
  Like X's blue badge verifies humans, AgentCred verifies AI agents.<br/>
  Cryptographic proof of which human is responsible for an AI agent's actions.
</p>

---

## Try It Now (2 minutes)

See AgentCred verification in action (GitHub auth required):

```bash
# Initialize identity (once) — this starts the GitHub OAuth device flow
npx @agentcred-ai/cli init

# Sign a message
echo "Hello from a verified AI agent!" | npx @agentcred-ai/cli sign --agent demo-bot > envelope.json

# Verify it
npx @agentcred-ai/cli verify < envelope.json
```

TIP: To skip the OAuth flow, pass a token:

```bash
npx @agentcred-ai/cli init --token ghp_your_token
```

---

## The Problem

AI agents are everywhere — writing code, posting comments, sending emails. But they're **anonymous**.

| Platform | The Problem |
|----------|-------------|
| **Reddit** | Can't tell who's a bot |
| **YouTube** | Can't trace comment sources |
| **Your inbox** | Can't verify if "AI assistant" is trustworthy |

When an agent makes a mistake or spreads misinformation, **there's no accountability**.

## The Solution

AgentCred gives every AI agent a **verifiable identity** tied to a real human:

```
Agent Output → Cryptographic Signature → GitHub Identity → ✓ @username
```

- **Ed25519 signatures**: Same crypto that secures billions of SSH connections
- **GitHub identity**: Developer trust you already recognize
- **Open standard**: Not controlled by any single company

---

## Who Is This For?

| You Are... | Your Pain Point | AgentCred Solves It |
|------------|-----------------|---------------------|
| **AI Agent Developer** | "My bot looks like every other spam bot" | Signatures establish trust and reputation |
| **Platform Operator** | "Can't trace AI-generated content" | Verification API for filtering and moderation |
| **Enterprise** | "Need audit trail for AI actions" | Every action attributed to responsible human |
| **End User** | "Is this bot trustworthy?" | Browser badge shows verification instantly |

---

## Installation

Pick your IDE or tool to get started:

<details>
<summary><b>Claude Desktop</b> (Recommended)</summary>

**Config file location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. Done!

</details>

<details>
<summary><b>Cursor</b></summary>

**Config file location:** `~/.cursor/mcp.json`

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

Restart Cursor. Done!

</details>

<details>
<summary><b>VS Code (Cline)</b></summary>

**Config file location:** `.vscode/mcp.json` (workspace) or `~/.vscode/mcp.json` (global)

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

Restart VS Code. Done!

</details>

<details>
<summary><b>Windsurf</b></summary>

**Config file location:** `~/.codeium/windsurf/mcp_config.json`

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

Restart Windsurf. Done!

</details>

<details>
<summary><b>Zed</b></summary>

**Config file location:** `~/.config/zed/settings.json`

```json
{
  "context_servers": {
    "agentcred": {
      "command": "npx",
      "args": ["-y", "@agentcred-ai/mcp-server"]
    }
  }
}
```

Restart Zed. Done!

</details>

<details>
<summary><b>Claude Code (CLI)</b></summary>

```bash
# Add to your shell config (~/.bashrc, ~/.zshrc, etc.)
export MCP_SERVERS='{"agentcred":{"command":"npx","args":["-y","@agentcred-ai/mcp-server"]}}'

# Or run inline:
MCP_SERVERS='{"agentcred":{"command":"npx","args":["-y","@agentcred-ai/mcp-server"]}}' claude
```

Done!

</details>

<details>
<summary><b>CLI Only (No IDE)</b></summary>

```bash
# Install globally
npm install -g @agentcred-ai/cli

# Or use with npx (no install)
npx @agentcred-ai/cli --help
```

</details>

<details>
<summary><b>SDK (Node.js/TypeScript)</b></summary>

```bash
npm install agentcred
```

```typescript
import { sign, verify } from 'agentcred'
```

</details>

---

## Authentication

AgentCred links your AI agent to your **GitHub identity**. Two methods are supported:

### Option 1: OAuth Device Flow (Default)

When you run `init`, your browser opens automatically for GitHub login:

```bash
npx @agentcred-ai/cli init
```

**What happens:**
1. CLI shows a one-time code (e.g., `ABCD-1234`)
2. Browser opens to `github.com/login/device`
3. Enter the code and authorize
4. Ed25519 keypair generated and registered

> No secrets to manage! OAuth tokens are handled automatically.

### Option 2: Personal Access Token (PAT)

For CI/CD, headless servers, or if OAuth doesn't work:

```bash
# Via flag
npx @agentcred-ai/cli init --token ghp_your_token

# Via environment variable
export GITHUB_TOKEN=ghp_your_token
npx @agentcred-ai/cli init
```

**For MCP Server** (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "agentcred": {
      "command": "npx",
      "args": ["-y", "@agentcred-ai/mcp-server"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token",
        "GITHUB_USERNAME": "your-github-username"
      }
    }
  }
}
```

[Create a GitHub PAT here](https://github.com/settings/tokens/new?description=AgentCred&scopes=read:user) (only `read:user` scope needed)

---

## Quick Start

### For AI Assistants (Claude, Cursor, etc.)

1. Add AgentCred to your MCP config (see [Installation](#installation))
2. Restart your AI assistant
3. Ask: *"Initialize AgentCred and sign this message: Hello world"*

**That's it!** Your agent now has a verifiable identity.

### For CLI

```bash
# Step 1: Initialize (opens browser for GitHub OAuth)
npx @agentcred-ai/cli init

# Step 2: Sign anything
echo "Hello world" | npx @agentcred-ai/cli sign --agent my-bot > envelope.json

# Step 3: Verify
npx @agentcred-ai/cli verify < envelope.json

# Check your identity
npx @agentcred-ai/cli whoami
```

> **Using PAT instead?** See [Authentication](#authentication).

### For Web Content (Invisible Signatures)

For blogs, social media, and web pages, use `signWithHTML()` which embeds signatures invisibly:

```typescript
import { signWithHTML } from 'agentcred'

const html = await signWithHTML("Hello world", identity, { agent: "my-bot" })
// Returns: <span data-agentcred="...">Hello world</span>
// Verification tools can detect and verify this automatically.
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. AUTHENTICATE      2. GENERATE        3. SIGN          4. VERIFY        │
│  ┌─────────────┐     ┌─────────────┐   ┌─────────────┐  ┌─────────────┐    │
│  │   GitHub    │     │  Ed25519    │   │   Agent     │  │   Anyone    │    │
│  │   OAuth     │────▶│  Keypair    │──▶│   Signs     │─▶│  Verifies   │    │
│  │   Login     │     │  Generated  │   │   Output    │  │  ✓ Badge    │    │
│  └─────────────┘     └─────────────┘   └─────────────┘  └─────────────┘    │
│        │                   │                 │                │            │
│        ▼                   ▼                 ▼                ▼            │
│   "I am @alice"      Public key        JWS signature    "✓ @alice"        │
│                      registered        + SHA-256 hash    verified          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Step | What Happens | Where |
|------|--------------|-------|
| 1. **Authenticate** | Verify GitHub identity via OAuth or PAT | Browser / Terminal |
| 2. **Generate Keys** | Create Ed25519 keypair (public + private) | Your machine (`~/.agentcred/`) |
| 3. **Register** | Link public key to GitHub username | AgentCred API |
| 4. **Sign** | Agent creates JWS with content hash | Your agent |
| 5. **Verify** | Check signature against registered key | Anyone, anywhere |

**Output format (AgentCred Envelope)**:
```json
{
  "agentcred": {
    "v": "1.0",
    "jws": "eyJhbGciOiJFZERTQSIs...",
    "github": "username",
    "agent": "bot-name"
  },
  "content": "The signed content"
}
```

---

## Real-World Use Cases

### 1. Verified Bot Comments

**Problem**: Your helpful AI bot on Reddit/Discord is indistinguishable from spam.

**Solution**: Sign every message. Users see `✓ @yourname` badge.

```typescript
const response = await myBot.generateResponse(userQuestion)
const signed = await sign(response, identity, { agent: "support-bot" })
await postToDiscord(signed)  // Recipients can verify
```

### 2. Enterprise Audit Trail

**Problem**: Compliance requires knowing who's responsible for AI-generated reports.

**Solution**: Every AI action is cryptographically attributed.

```python
# CrewAI agent with AgentCred
analyst = Agent(
    role="Financial Analyst",
    tools=mcp_adapter.get_tools(),  # AgentCred signing
)
# All outputs signed: "Report generated by @alice's agent at 2026-02-03"
```

### 3. Auto-Sign All AI Outputs

**Problem**: You want every response from your AI to be signed automatically.

**Solution**: Middleware wraps all outputs.

```typescript
// Vercel AI SDK - 3 lines to sign everything
const signedModel = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: createAgentCredMiddleware({ github: 'you', privateKey }),
})
// Every response is now signed!
```

### 4. Content Authenticity

**Problem**: Team can't verify if AI analysis is legitimate.

**Solution**: Share signed envelope, anyone can verify.

```bash
# Alice signs her AI's analysis
echo "Q4 revenue up 15%" | npx @agentcred-ai/cli sign > analysis.json

# Bob verifies it came from Alice
npx @agentcred-ai/cli verify < analysis.json
# ✓ Verified: @alice (analyst-bot) at 2026-02-03T18:36:09Z
```

---

## Framework Integrations

| Framework | Language | Effort | |
|-----------|----------|--------|---|
| **Claude Desktop** | — | Config only | [Setup](#installation) |
| **Vercel AI SDK** | TypeScript | 3 lines | [Example](./examples/vercel-ai-sdk/) |
| **Mastra** | TypeScript | 3 lines | [Example](./examples/mastra-integration/) |
| **LangChain** | Python | 10 lines | [Guide](./examples/langchain-mcp/) |
| **CrewAI** | Python | 10 lines | [Guide](./examples/crewai-mcp/) |
| **Any CLI** | Any | Shell out | `npx @agentcred-ai/cli sign` |

<details>
<summary><strong>TypeScript: Vercel AI SDK</strong></summary>

```typescript
import { createAgentCredMiddleware } from '@agentcred-ai/vercel'
import { wrapLanguageModel } from 'ai'

const signedModel = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: createAgentCredMiddleware({ github: 'you', privateKey }),
})
```

</details>

<details>
<summary><strong>Python: LangChain</strong></summary>

```python
import os

from langchain_mcp_adapters.client import MultiServerMCPClient
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
tools = await client.get_tools()  # agentcred_sign, agentcred_verify
agent = create_react_agent(ChatOpenAI(model="gpt-4o"), tools)
```

</details>

---

## Philosophy

### Why GitHub Identity?

Developers already have GitHub accounts. It's a platform built on trust, collaboration, and reputation. Your GitHub profile is an identity you own and others recognize.

### Why Ed25519?

It's the same cryptography that secures SSH, Signal, and WhatsApp. Fast, secure, and battle-tested.

### Why Not Blockchain?

Simplicity. A centralized key registry is faster, cheaper, and sufficient for v1.0. The signatures themselves are decentralized — once signed, the proof exists independently.

### Why Open Source?

Social media "blue badges" are controlled by one company. AgentCred is powered by mathematics and open standards. Your signatures remain valid regardless of any company's decisions.

---

## Packages

| Package | Description |
|---------|-------------|
| [`agentcred`](https://www.npmjs.com/package/agentcred) | Core SDK |
| [`@agentcred-ai/sdk`](https://www.npmjs.com/package/@agentcred-ai/sdk) | Full SDK with all exports |
| [`@agentcred-ai/mcp-server`](https://www.npmjs.com/package/@agentcred-ai/mcp-server) | MCP server for Claude |
| [`@agentcred-ai/cli`](https://www.npmjs.com/package/@agentcred-ai/cli) | Command-line tool |
| [`@agentcred-ai/vercel`](https://www.npmjs.com/package/@agentcred-ai/vercel) | Vercel AI SDK middleware |
| [`@agentcred-ai/mastra`](https://www.npmjs.com/package/@agentcred-ai/mastra) | Mastra tool wrapper |

---

## Documentation

- [**guide.md**](./guide.md) — Beginner-friendly walkthrough
- [**examples/**](./examples/) — Working code examples

---

## Roadmap

### Phase 1: Prove It Works (Months 1-3)

- [ ] Web verification UI at `agentcred.dev/verify`
- [ ] Embeddable "Verified Agent" badge component
- [ ] Complete [**OpenClaw**](./integrations/openclaw) & [**Moltbook**](./integrations/moltbook) integrations
- [ ] Demo videos & Show HN launch

### Phase 2: Lower Barriers (Months 4-6)

- [ ] Email-based identity (no GitHub required)
- [ ] Mirror registry for reliability
- [ ] Developer platform partnerships

### Phase 3: Enterprise Ready (Months 7-12)

- [ ] Key revocation system
- [ ] Long-term signature preservation
- [ ] Team management & SSO

Want to see another framework supported? [Open an issue](https://github.com/agentcred-ai/agentcred/issues/new) or contribute!    

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT

---

<p align="center">
  <strong>Build trust into your AI agents.</strong><br/>
  <a href="#quick-start">Get Started</a> · <a href="https://agentcred.dev">Website</a> · <a href="https://github.com/agentcred-ai/agentcred">GitHub</a>
</p>
