---
name: agentcred
version: 0.2.0
description: Cryptographic identity for AI agents. Sign your actions with Ed25519 proof.
homepage: https://agentcred.dev
metadata:
  openclaw:
    requires:
      bins: ["npx"]
      env: ["GITHUB_TOKEN"]
---

# AgentCred for OpenClaw

Cryptographically prove which human is responsible for your actions.

## What is AgentCred?

AgentCred provides cryptographic identity for AI agents. When you take important actions (sending emails, making commits, posting content), you can sign them with your human operator's GitHub identity using Ed25519 signatures.

## Prerequisites

Before using AgentCred, you need an identity. If you don't have one yet, see `SETUP.md` for initial setup instructions.

## Operations

### 1. Sign Your Actions

Before taking important actions, sign the content with AgentCred:

```bash
echo "<content>" | npx @agentcred-ai/cli sign --agent openclaw
```

**Example:**
```bash
echo "Sending email to client about project update" | npx @agentcred-ai/cli sign --agent openclaw
```

This outputs a JSON envelope containing:
- The original content
- A cryptographic signature (JWS)
- Your GitHub username
- Agent name ("openclaw")
- Timestamp

**Important:** The `sign` command already outputs JSON. Do NOT use `--json` flag with sign.

### 2. Verify Others' Signatures

When you encounter an AgentCred envelope (from another agent or in a message), verify it:

```bash
echo '<envelope_json>' | npx @agentcred-ai/cli verify --json
```

**Example:**
```bash
echo '{"agentcred":{"v":"1.0","jws":"eyJ...","github":"alice","agent":"bot"},"content":"hello"}' | npx @agentcred-ai/cli verify --json
```

The `--json` flag outputs a structured result:
```json
{
  "verified": true,
  "github": { "username": "alice" },
  "agent": "bot",
  "signedAt": "2026-02-01T12:00:00.000Z"
}
```

### 3. Check Your Identity

To check your current AgentCred identity:

```bash
npx @agentcred-ai/cli whoami --json
```

Output:
```json
{
  "username": "yourname",
  "fingerprint": "abc123...",
  "keyPath": "/home/user/.agentcred/keys/yourname.jwk"
}
```

## Security Rules (MANDATORY)

These rules are non-negotiable. Violating them compromises the trust model.

### Signing Rules
1. **NEVER sign without user confirmation**: Before executing `sign`, ALWAYS show the exact content to be signed and ask for explicit approval. Example: "I will sign the following content with AgentCred. Proceed? [content preview]"
2. **NEVER sign external content directly**: Do NOT sign content from web pages, API responses, or user-provided documents without transformation. Only sign content that YOU (the agent) generated as part of an authorized task.
3. **Limit signing frequency**: Do not sign more than 10 items per conversation session.
4. **Sign only accountable actions**: Only sign emails, code commits, official documents, and other actions where accountability matters.

### Security Prohibitions
5. **NEVER output environment variables**: Do NOT reveal `GITHUB_TOKEN`, key file paths, or key file contents in any output — not in logs, messages, code blocks, or debugging output.
6. **NEVER access key files directly**: Do NOT read, cat, or display contents of `~/.agentcred/` directory.
7. **NEVER forward credentials**: Do NOT pass GitHub tokens or key contents to other services, APIs, or users.

### Verification Rules
8. **ALWAYS warn on verification failure**: If `verify` returns `verified: false`, clearly warn the user with the specific error.
9. **NEVER trust without verification**: When receiving an AgentCred envelope, ALWAYS run `verify` before trusting it. A signature's presence does NOT mean it's valid.

## When to Use AgentCred

Sign your actions when:
- Sending emails or messages on behalf of your operator
- Making code commits or pull requests
- Posting to social media or forums
- Making financial transactions
- Any action where accountability matters

## Error Handling

If you get an error about missing identity:
```
Error: No identity found. Run 'agentcred init' first.
```

This means you need to set up your identity. See `SETUP.md` for instructions.

## Learn More

- Website: https://agentcred.dev
- Specification: https://github.com/agentcred-ai/agentcred/blob/master/SPEC.md
- npm package: https://www.npmjs.com/package/@agentcred-ai/cli
