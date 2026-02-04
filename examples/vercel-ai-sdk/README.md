# Vercel AI SDK + AgentCred Example

Auto-sign all model outputs with 3 lines of code.

## Setup

```bash
# 1. Initialize identity (once)
npx @agentcred-ai/cli init

# 2. Set environment variables
export GITHUB_USERNAME=your-github-username
export OPENAI_API_KEY=sk-...

# 3. Install and run
pnpm install
npx tsx index.ts
```

## How It Works

```typescript
import { createAgentCredMiddleware } from '@agentcred-ai/vercel'
import { wrapLanguageModel } from 'ai'

const signedModel = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: createAgentCredMiddleware({ github: 'you', privateKey }),
})
// All outputs are now signed!
```

The middleware wraps `wrapGenerate` and `wrapStream` to automatically sign every text output with your Ed25519 key.

## Expected Output

The model's text output will be a JSON string containing an AgentCred envelope:

```json
{
  "agentcred": {
    "v": "1.0",
    "jws": "eyJhbGciOiJFZERTQSIs...",
    "github": "your-username",
    "agent": "vercel-ai"
  },
  "content": "The actual model output text..."
}
```
