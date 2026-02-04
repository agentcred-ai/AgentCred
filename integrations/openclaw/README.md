# AgentCred Skill for OpenClaw

Cryptographic identity for OpenClaw agents. Prove which human is behind the agent.

## Installation

### Option 1: Local Copy

```bash
cp -r integrations/openclaw ~/.openclaw/skills/agentcred
```

### Option 2: Download from GitHub

```bash
mkdir -p ~/.openclaw/skills/agentcred
curl -s https://raw.githubusercontent.com/agentcred-ai/agentcred/master/integrations/openclaw/SKILL.md > ~/.openclaw/skills/agentcred/SKILL.md
curl -s https://raw.githubusercontent.com/agentcred-ai/agentcred/master/integrations/openclaw/SETUP.md > ~/.openclaw/skills/agentcred/SETUP.md
```

## Setup

Before using this skill, you need to set up your AgentCred identity:

1. Get a GitHub Personal Access Token (with `read:user` scope)
2. Set environment variable:
   ```bash
   export GITHUB_TOKEN="ghp_your_token_here"
   ```
3. Initialize your identity:
   ```bash
   npx @agentcred-ai/cli init
   ```

See `SETUP.md` for detailed instructions.

## Usage

Once installed, OpenClaw can use AgentCred to:

- **Sign actions**: Cryptographically sign important actions before executing them
- **Verify signatures**: Verify AgentCred envelopes from other agents
- **Check identity**: Confirm the current AgentCred identity

### Example: Signing an Email

```bash
# Agent signs the email content before sending
echo "Dear client, the project update is ready..." | npx @agentcred-ai/cli sign --agent openclaw
```

### Example: Verifying a Message

```bash
# Agent verifies a signed message from another agent
echo '{"agentcred":{...},"content":"..."}' | npx @agentcred-ai/cli verify --json
```

## How It Works

1. **Identity**: Your OpenClaw agent is linked to your GitHub account via Ed25519 keypair
2. **Signing**: Agent signs content using the private key, creating a JWS (JSON Web Signature)
3. **Verification**: Anyone can verify the signature using the public key registry

## Requirements

- `npx` (comes with Node.js)
- GitHub account
- Internet connection (for init and verify operations)

## Security

AgentCred handles cryptographic keys and GitHub credentials. Please review the security guidelines:

- **SKILL.md**: Contains mandatory security rules for agent behavior (signing limits, credential protection)
- **SETUP.md**: Contains private key protection, token management, and key compromise response procedures

**Key points:**
- Never share private key files (`~/.agentcred/keys/*.jwk`)
- Never expose `GITHUB_TOKEN` in logs or output
- Signatures are valid for 24 hours only
- Always verify envelopes before trusting them

## Learn More

- AgentCred Website: https://agentcred.dev
- GitHub Repository: https://github.com/agentcred-ai/agentcred
- Protocol Specification: https://github.com/agentcred-ai/agentcred/blob/master/SPEC.md

## Support

- Issues: https://github.com/agentcred-ai/agentcred/issues
- Discussions: https://github.com/agentcred-ai/agentcred/discussions
