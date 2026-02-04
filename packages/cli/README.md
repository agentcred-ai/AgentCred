# @agentcred-ai/cli

> CLI tool for AgentCred developer workflows — sign and verify agent credentials from the command line.

## Installation

No installation needed! Use with `npx`:

```bash
npx @agentcred-ai/cli --help
```

Or install globally:

```bash
npm install -g @agentcred-ai/cli
agentcred --help
```

## Quick Start

```bash
# 1. Initialize identity with GitHub token
npx @agentcred-ai/cli init --token ghp_your_github_token

# 2. Sign content
echo "Hello world" | npx @agentcred-ai/cli sign --agent my-bot

# 3. Verify an envelope
npx @agentcred-ai/cli verify < envelope.json

# 4. Check current identity
npx @agentcred-ai/cli whoami
```

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `init --token <token>` | Initialize identity with GitHub OAuth token | `agentcred init --token ghp_...` |
| `sign [file]` | Sign content (file or stdin) | `echo "msg" \| agentcred sign --agent bot` |
| `verify [file]` | Verify AgentCred envelope | `agentcred verify < envelope.json` |
| `whoami` | Show current identity | `agentcred whoami` |

### Sign Options

- `--agent <name>` — Agent name (optional, defaults to `default`)

### Verify Options

- `--offline` — Verify offline with public key (requires `--key`)
- `--key <path>` — Path to public key file (for offline verification)

## Documentation

See [main README](../../README.md) for full documentation and examples.

## License

MIT
