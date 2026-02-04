# Integration Guide

Official integration notes for AgentCred framework adapters.

## Vercel AI SDK (TypeScript)

AgentCred provides a middleware that auto-signs model outputs. The signed output is returned as a JSON string (AgentCred envelope).

### Install

```bash
npm install @agentcred-ai/vercel @agentcred-ai/sdk
npm install ai@^4.0.0 @ai-sdk/openai@^1.0.0
```

### Setup

```bash
# one-time identity setup
npx @agentcred-ai/cli init

# runtime env
export GITHUB_USERNAME=your-github-username
export OPENAI_API_KEY=sk-...
```

### Usage

```typescript
import { openai } from '@ai-sdk/openai'
import { generateText, wrapLanguageModel } from 'ai'
import { createAgentCredMiddleware } from '@agentcred-ai/vercel'
import { loadIdentity } from '@agentcred-ai/sdk'

const identity = await loadIdentity(process.env.GITHUB_USERNAME!)
if (!identity) throw new Error('No identity found. Run: npx @agentcred-ai/cli init')

const signedModel = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: createAgentCredMiddleware({
    github: process.env.GITHUB_USERNAME!,
    privateKey: identity.privateKey,
  }),
})

const result = await generateText({
  model: signedModel,
  prompt: 'Say hello in one sentence.',
})

console.log(result.text) // JSON string: AgentCred envelope
```

### Expected Output

The model output is a JSON string containing the signed envelope:

```json
{
  "agentcred": {
    "v": "1.0",
    "jws": "eyJhbGciOiJFZERTQSIs...",
    "github": "your-github-username",
    "agent": "vercel-ai"
  },
  "content": "Hello from a signed Vercel AI SDK response."
}
```


## Mastra (TypeScript)

AgentCred can wrap any Mastra-compatible tool object to automatically sign tool output.

### Install

```bash
npm install @agentcred-ai/mastra @agentcred-ai/sdk
```

If the packages are not published yet, install from local paths:

```bash
npm install \
  ~/MyProjects/agentcred/packages/mastra \
  ~/MyProjects/agentcred/packages/sdk
```

### Setup

```bash
# one-time identity setup
npx @agentcred-ai/cli init

# runtime env
export GITHUB_USERNAME=your-github-username
```

### signedTool() wrapper

```typescript
import { signedTool } from '@agentcred-ai/mastra'
import { loadIdentity } from '@agentcred-ai/sdk'

const identity = await loadIdentity(process.env.GITHUB_USERNAME!)
if (!identity) throw new Error('No identity found. Run: npx @agentcred-ai/cli init')

const weatherTool = {
  id: 'get-weather',
  description: 'Get weather for a city',
  execute: async ({ context }: { context: { city: string } }) => {
    return `The weather in ${context.city} is sunny with 22°C.`
  },
}

const signedWeatherTool = signedTool(weatherTool, {
  github: process.env.GITHUB_USERNAME!,
  privateKey: identity.privateKey,
  agent: 'weather-agent',
})

const result = await signedWeatherTool.execute({ context: { city: 'Seoul' } })
console.log(result) // AgentCred envelope
```

### createAgentCredTools() standalone tools

```typescript
import { createAgentCredTools } from '@agentcred-ai/mastra'
import { loadIdentity } from '@agentcred-ai/sdk'

const identity = await loadIdentity(process.env.GITHUB_USERNAME!)
if (!identity) throw new Error('No identity found. Run: npx @agentcred-ai/cli init')

const tools = createAgentCredTools({
  github: process.env.GITHUB_USERNAME!,
  privateKey: identity.privateKey,
})

const signResult = await tools.agentcred_sign.execute({
  content: 'This is a standalone signed message',
  agent: 'standalone-test',
})

const verifyResult = await tools.agentcred_verify.execute({
  envelope: JSON.stringify(signResult),
})

console.log(verifyResult.verified) // true
```


## Python CLI Wrapper

The Python package shells out to the Node.js CLI and provides `init()`, `sign()`, `verify()`, and `whoami()`.

### Install

```bash
python3 -m venv .venv
source .venv/bin/activate

pip install agentcred
```

If the package is not published yet, install from the local repo:

```bash
pip install -e ~/MyProjects/agentcred/packages/python-cli
```

### Setup

```bash
# one-time identity setup
npx @agentcred-ai/cli init
```

### Usage

```python
from agentcred import sign, verify, whoami

identity = whoami()
print(identity["username"])

envelope = sign("Hello from Python!", agent="python-test")
result = verify(envelope)
print(result["verified"])  # True
```
