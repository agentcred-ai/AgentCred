# AGENTS.md - AgentCred Project Context

## Project Overview

AgentCred is a complete, production-ready open-source protocol that cryptographically proves which human is responsible for an AI agent's actions. Think "X's blue badge for AI agents" -- but decentralized and cryptographic.

- **Signature**: Ed25519 via `jose` library, JWS compact serialization (RFC 7515)
- **Identity**: GitHub username bound via OAuth token verification
- **Status**: 100% COMPLETE. 164+ tests passing. Build and typecheck clean.
- **Deployment**: GitHub repo LIVE. CI/CD active. npm published. Cloudflare deployment ready.

## Repository Structure

```
agentcred/
├── packages/
│   ├── sdk/              # Core library: sign, verify, identity (84 tests, 8 files)
│   ├── mcp-server/       # MCP server for Claude Desktop (17 tests, 3 files)
│   ├── cli/              # CLI: init, sign, verify, whoami (27 tests, 5 files)
│   ├── agentcred/        # Convenience re-export package (3 tests, 1 file)
│   ├── api/              # Cloudflare Worker verification API (19 tests, 1 file)
│   ├── vercel/           # Vercel AI SDK middleware (7 tests, 1 file)
│   ├── mastra/           # Mastra tool wrapper (7 tests, 1 file)
│   ├── python-cli/       # Python CLI wrapper (pytest integration)
│   └── website/          # Landing page (Astro + Tailwind)
├── examples/
│   ├── basic-signing/    # Identity -> sign -> verify workflow
│   ├── mcp-integration/  # MCP server setup guide
│   ├── verify-in-browser/# Browser verification demo
│   ├── mastra-integration/ # Mastra signedTool example
│   ├── vercel-ai-sdk/    # Vercel AI SDK middleware example
│   ├── python-signing/   # Python CLI wrapper example
│   ├── langchain-mcp/    # LangChain MCP adapter example
│   └── crewai-mcp/       # CrewAI MCP adapter example
├── integrations/
│   ├── moltbook/         # Moltbook skill integration
│   └── openclaw/         # OpenClaw skill integration
├── docs/
│   ├── guide.md          # Beginner guide (English)
│   └── integration-guide.md # Framework integration guide
├── README.md             # Developer quick start
├── LICENSE               # MIT
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

## Tech Stack and Build System

| Component | Tool | Version |
|-----------|------|---------|
| Monorepo | pnpm workspaces + Turborepo | pnpm 10.0.0, turbo 2.0.0 |
| Language | TypeScript (strict, NodeNext) | 5.8.0 (catalog) |
| Build | tsup (ESM + CJS + DTS) | 8.0.0 (catalog) |
| Test | Vitest | 3.0.0 (catalog) |
| Runtime | Node.js | 22.21.1 |

Key dependencies:
- `jose` (^6.1.3) -- Ed25519 signing/verification
- `zod` (^4.3.6) -- Schema validation
- `@modelcontextprotocol/sdk` (^1.25.3) -- MCP server framework
- `hono` (^4.11.7) -- Cloudflare Worker routing
- `astro` (^5.17.1) + `tailwindcss` (^3.4.17) -- Landing page

## Commands

```bash
pnpm install          # Install all deps
pnpm build            # Build all packages
pnpm test             # Run all 164+ tests
pnpm typecheck        # TypeScript check (must be 0 errors)
node packages/cli/dist/index.js --help  # Test CLI

# Integration tests (requires env vars)
scripts/test/integration/test-all.sh    # Run all integration tests
scripts/test/integration/test-sdk.sh    # SDK only (no external API)
scripts/test/integration/test-mastra.sh # Mastra integration
scripts/test/integration/test-vercel.sh # Vercel AI SDK integration
scripts/test/integration/test-python.sh # Python CLI wrapper
```

## CI/CD

### GitHub Actions Workflows

Three workflows configured:

1. **`ci-test-integration.yml`** — Main CI/CD pipeline (runs on push to `main`, PRs to `main`)
   | Job | Steps |
   |-----|-------|
   | `test` | Install → Build → Typecheck → Unit Tests (164+ tests) |
   | `integration` | SDK → Mastra → Vercel → CLI → MCP Server → Python → LangChain → CrewAI |

2. **`claude.yml`** — Claude Code assistant (triggered by `@claude` mentions)

3. **`claude-code-review.yml`** — Automated code review on PRs

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `AGENTCRED_GITHUB_TOKEN` | GitHub PAT (mapped to `GITHUB_TOKEN` env var) |

### Integration Test Scripts

```
scripts/test/integration/
├── test-all.sh        # Master runner for all tests
├── test-sdk.sh        # SDK sign/verify (local keys, no API)
├── test-mastra.sh     # Mastra signedTool wrapper (local keys)
├── test-vercel.sh     # Vercel AI SDK middleware (local keys)
├── test-cli.sh        # CLI commands (requires GITHUB_TOKEN)
├── test-mcp-server.sh # MCP server exports/creation
├── test-python.sh     # Python CLI wrapper (requires GITHUB_TOKEN)
├── test-langchain.sh  # LangChain MCP adapter (tool loading only)
└── test-crewai.sh     # CrewAI MCP adapter (tool loading only)
```

**Test categories:**
- **No external API**: SDK, Mastra, Vercel, MCP Server, LangChain, CrewAI (use generated Ed25519 keys)
- **Requires GITHUB_TOKEN**: CLI, Python (identity verification)

### Pre-commit Hook

`.husky/pre-commit` runs `pnpm test` before each commit.

## Core Protocol

### Envelope Format

```json
{
  "agentcred": {
    "v": "1.0",
    "jws": "eyJhbGciOiJFZERTQSIsInR5cCI6ImFnZW50Y3JlZCtqd3QifQ...",
    "github": "username",
    "agent": "agent-name"
  },
  "content": "The actual signed content"
}
```

### JWS Structure

- **Header**: `{ alg: "EdDSA", typ: "agentcred+jwt", kid: "{github}@agentcred" }`
- **Payload**: `{ iss, sub, iat, content_hash (sha256), content_type, nonce }`
- **Verification**: Signature check + content_hash match + timestamp within 24h window

### API Endpoints (Cloudflare Worker)

```
POST   /v1/keys              -- Register public key (requires GitHub token)
GET    /v1/keys/{username}    -- Lookup public key (public)
POST   /v1/verify             -- Verify AgentCred envelope (public)
GET    /v1/health             -- Health check
```

### SDK Core Functions

```typescript
import { createIdentity, loadIdentity, sign, verify, verifyOffline } from '@agentcred-ai/sdk';
// or: import { sign, verify } from 'agentcred';

// Identity
const identity = await createIdentity(githubToken, { storage });
const loaded = await loadIdentity(username, { storage });

// Sign
const envelope = await sign(content, { privateKey, github }, { agent: 'my-bot' });

// Verify
const result = await verify(envelope);                    // Online (via API)
const result = await verifyOffline(envelope, publicKey);  // Offline
```

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Crypto library | `jose` | Full JWS lifecycle (sign, verify, key gen, import/export) |
| Identity provider | GitHub OAuth | Developer trust, simple token validation |
| Signature format | JWS compact | Industry standard (RFC 7515), widely supported |
| Key algorithm | Ed25519 (EdDSA) | Fast, secure, small keys (RFC 8037) |
| CLI arg parsing | `node:util parseArgs` | Zero external deps, built-in since Node 18.3 |
| API framework | Hono | Lightweight, Cloudflare Workers native |
| No blockchain | Intentional | Simplicity over decentralization theater |

## Known Gotchas

1. **jose key export**: `generateKeyPair('EdDSA')` creates non-extractable keys by default. Must pass `{ extractable: true }`.
2. **TypeScript imports**: NodeNext resolution requires `.js` extensions in relative imports.
3. **tsup output**: Generates `.js` (ESM) not `.mjs`. Package.json exports must use `.js`.
4. **parseArgs strict:false**: Returns `string | true` for string options. Need runtime type guards before passing to functions expecting `string`.
5. **Astro expressions**: `{}` in HTML treated as expressions. Escape with `&#123;` / `&#125;`.
6. **Package.json exports order**: `types` field must come FIRST before `import`/`require`.
7. **Mock patterns**: Tests mock fetch via `vi.stubGlobal('fetch', vi.fn())`. Real Ed25519 keypairs used in integration tests (not mock JWKs).

## Package Details

### @agentcred-ai/sdk (packages/sdk/) — v0.1.3
Core library with 5 modules: `types.ts`, `identity.ts`, `sign.ts`, `verify.ts`, `storage.ts`.
- `FileSystemKeyStorage`: Stores keys in `~/.agentcred/keys/{username}.jwk`
- `MemoryKeyStorage`: For testing and browser environments
- **84 tests across 8 test files**: sign (8), verify (13), identity (11), storage (23), oauth (13), sign-html (12), integration (3), index (1)

### @agentcred-ai/mcp-server (packages/mcp-server/) — v0.1.3
MCP server with 4 tools (init, sign, verify, whoami) and 2 resources (identity spec, protocol spec).
- Uses `@modelcontextprotocol/sdk` low-level `Server` class with `StdioServerTransport`
- Storage: `FileSystemKeyStorage` at `~/.agentcred/keys/{username}.jwk`
- Identity resolution: uses `GITHUB_USERNAME` env if set before tool calls
- **17 tests across 3 test files**: tools (12), resources (4), index (1)

### @agentcred-ai/cli (packages/cli/) — v0.2.1
4 commands: `init --token`, `sign [file]`, `verify [file] [--offline --key]`, `whoami`.
- Reads from file arg or stdin
- **27 tests across 5 test files**: init (10), verify (8), sign (4), whoami (4), index (1)

### @agentcred-ai/api (packages/api/) — v0.1.3
Cloudflare Worker with Hono routing. KV-based key storage and rate limiting.
- **19 tests** using `@cloudflare/vitest-pool-workers`
- Configured for `api.agentcred.dev` with production KV namespace

### agentcred (packages/agentcred/) — v0.2.1
Zero-logic re-export of `@agentcred-ai/sdk`. Enables `import { sign } from 'agentcred'`.
- **3 tests** (1 test file: index)

### @agentcred-ai/vercel (packages/vercel/) — v0.1.1
Vercel AI SDK middleware for auto-signing agent outputs.
- `createAgentCredMiddleware()` wraps language models
- **7 tests** (1 test file: middleware)

### @agentcred-ai/mastra (packages/mastra/) — v0.1.1
Mastra tool wrapper for signing tool outputs.
- `signedTool()` wraps Mastra tools
- **7 tests** (1 test file: tool)

### @agentcred-ai/python-cli (packages/python-cli/)
Python wrapper for AgentCred CLI with pytest integration.
- Subprocess-based CLI invocation
- Compatible with LangChain and CrewAI MCP adapters

### @agentcred-ai/website (packages/website/) — v0.1.2
Astro + Tailwind landing page. Dark theme (#0a0a0a), green/red accents. 7 sections. Static HTML output.

## Git History

**98 commits** on `main` branch. Remote configured at `https://github.com/agentcred-ai/agentcred.git`.

Conventional commit style. Key milestones:
- Latest: API production config, package version bumps (v0.1.3, v0.2.1)
- Launch: v0.1.0, npm publishing, scope migrations (@agentcred → @agentcred-dev → @agentcred-ai)
- Core features: Extension, website, CLI, MCP server, SDK, API implementation

## Deployment Checklist

- [x] Create GitHub repository and push
- [x] Set up CI/CD (GitHub Actions) — 3 workflows active
- [x] Configure GitHub Secrets (`AGENTCRED_GITHUB_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`)
- [x] Publish to npm — All packages published (sdk 0.1.3, cli 0.2.1, etc.)
- [x] Configure API domain — `api.agentcred.dev` with production KV namespace
- [ ] Deploy API to Cloudflare (`wrangler deploy` in packages/api)
- [ ] Deploy website to Cloudflare Pages
- [ ] Create GitHub releases

## Documentation Writing Protocol

**NEVER document based on assumptions. ALWAYS verify against source.**

When creating/updating docs (README, API docs, guides):
1. **Read source FIRST**: Implementation files (`src/*.ts`), type definitions (`types.ts`), tests (`__tests__/*.test.ts`)
2. **Copy from working code**: Extract examples from tests or `examples/` directory - never write from imagination
3. **Verify every claim**: Function signatures (LSP), default values (grep source), CLI flags (check `parseArgs` options), return types (read implementation)
4. **Cross-check**: Does this match SPEC.md? Existing README? Do examples actually compile?

**Anti-pattern**: "This API probably works like X" → ❌ Read the actual code  
**Correct pattern**: "I read identity.ts and it returns { identity, privateKey }" → ✅

## Conventions

- Commit style: Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Inter-package deps: pnpm workspace protocol (`workspace:*`)
- Tests: Mock all external calls (GitHub API, AgentCred API, filesystem)
- Package.json exports: `types` first, then `import`, then `require`
- Versions: SDK/MCP-Server/API at v0.1.3, CLI/agentcred at v0.2.1, Vercel/Mastra at v0.1.1
- Root `package.json` is `private: true`
- pnpm catalogs: Define shared versions in `pnpm-workspace.yaml` (TypeScript, tsup, vitest)
