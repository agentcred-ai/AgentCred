# @agentcred-ai/sdk

> Core SDK for AgentCred — sign, verify, and manage agent credentials with Ed25519 cryptography.

## Installation

```bash
npm install @agentcred-ai/sdk
```

Or with pnpm:

```bash
pnpm add @agentcred-ai/sdk
```

## Quick Start

```typescript
import { createIdentity, loadIdentity, sign, verify } from '@agentcred-ai/sdk'

// 1. Create identity (linked to your GitHub account)
const identity = await createIdentity(githubToken)

// 2. Load identity (including private key) from storage
const loaded = await loadIdentity(identity.github.username)

// 3. Sign your agent's output
const envelope = await sign("Hello from my verified agent!", {
  privateKey: loaded.privateKey,
  github: identity.github.username
})

// 4. Anyone can verify
const result = await verify(envelope)
console.log(result.verified)        // true
console.log(result.github.username)  // "yourname"
```

### HTML Signing for Web Content

For web content (blogs, social media, comments), use `signWithHTML()` which embeds the signature invisibly:

```typescript
import { signWithHTML } from '@agentcred-ai/sdk'

const html = await signWithHTML("Hello from my verified agent!", {
  privateKey: loaded.privateKey,
  github: identity.github.username
}, { agent: "my-bot" })

// Returns: <span data-agentcred="...">Hello from my verified agent!</span>
// Verification tools can detect and verify this automatically.
```

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `createIdentity(token, options?)` | Initialize identity with GitHub OAuth token |
| `loadIdentity(username, options?)` | Load existing identity from storage |
| `sign(content, identity, options?)` | Sign content and return AgentCred envelope |
| `signWithHTML(content, identity, options?)` | Sign content and return HTML with embedded signature |
| `verify(envelope)` | Verify envelope online (via API) |
| `verifyOffline(envelope, publicKey)` | Verify envelope offline with public key |

### Storage

| Class | Description |
|-------|-------------|
| `FileSystemKeyStorage` | Stores keys in `~/.agentcred/keys/{username}.jwk` |
| `MemoryKeyStorage` | In-memory storage for testing/browser environments |
| `createDefaultStorage()` | Auto-select appropriate storage for environment |

### Types

- `AgentCredIdentity` — Identity with GitHub info and keypair
- `AgentCredEnvelope` — Signed content with JWS and metadata
- `VerifyResult` — Verification result with identity and timestamp

## Documentation

See [main README](../../README.md) for full documentation and examples.

## License

MIT
