# Python + AgentCred Example

Sign and verify content from Python using the AgentCred CLI wrapper.

## Prerequisites

- **Node.js 18+** (used internally via `npx`)
- **Python 3.10+**

## Setup

```bash
# 1. Install Python wrapper
pip install agentcred

# 2. Initialize identity (once)
npx @agentcred-ai/cli init --token ghp_your_token

# 3. Run
python example.py
```

## Usage

```python
from agentcred import sign, verify, whoami

# Sign (1 line)
envelope = sign("Your content here", agent="my-bot")

# Verify (1 line)
result = verify(envelope)
print(result["verified"])  # True
```

## How It Works

The Python wrapper calls the AgentCred CLI via `npx` under the hood. No Python crypto libraries needed — all signing uses the same Ed25519 implementation as the TypeScript SDK.
