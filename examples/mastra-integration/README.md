# Mastra + AgentCred Example

Wrap any Mastra tool to auto-sign its outputs with AgentCred.

## Setup

```bash
# 1. Initialize identity (once)
npx @agentcred-ai/cli init

# 2. Set environment variables
export GITHUB_USERNAME=your-github-username

# 3. Install and run
pnpm install
npx tsx index.ts
```

## Two Integration Patterns

### Pattern A: Wrap existing tools

```typescript
import { signedTool } from '@agentcred-ai/mastra'

const signed = signedTool(myTool, { github: 'you', privateKey })
// signed.execute() now returns AgentCred envelope
```

### Pattern B: Standalone sign/verify tools

```typescript
import { createAgentCredTools } from '@agentcred-ai/mastra'

const tools = createAgentCredTools({ github: 'you', privateKey })
// tools.agentcred_sign and tools.agentcred_verify
```

## Expected Output

Tool outputs are wrapped in an AgentCred envelope:

```json
{
  "agentcred": {
    "v": "1.0",
    "jws": "eyJhbGciOiJFZERTQSIs...",
    "github": "your-username",
    "agent": "search"
  },
  "content": "Results for: AI agent frameworks"
}
```
