# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentCred is a cryptographic protocol that proves which human is responsible for an AI agent's actions. It uses Ed25519 signatures (via `jose`) with GitHub identity verification. The project is production-ready with 164+ tests passing.

## Build Commands

```bash
# Install dependencies
pnpm install

# Build all packages (required before testing)
pnpm build

# Run all tests (164+ tests)
pnpm test

# TypeScript type checking
pnpm typecheck

# Run single package tests
cd packages/sdk && pnpm test
cd packages/cli && pnpm test

# Test CLI after building
node packages/cli/dist/index.js --help
```

## Integration Testing

Integration tests are in `scripts/test/integration/`:

```bash
# Run all integration tests
scripts/test/integration/test-all.sh

# Individual test suites
scripts/test/integration/test-sdk.sh      # SDK (no external API)
scripts/test/integration/test-cli.sh      # CLI (requires GITHUB_TOKEN)
scripts/test/integration/test-mcp-server.sh
scripts/test/integration/test-mastra.sh
scripts/test/integration/test-vercel.sh
scripts/test/integration/test-python.sh   # Python CLI (requires GITHUB_TOKEN)
scripts/test/integration/test-langchain.sh
scripts/test/integration/test-crewai.sh
```

**Note**: Tests requiring `GITHUB_TOKEN` environment variable: CLI, Python. All others use generated Ed25519 keys locally.

## Architecture

### Monorepo Structure

- **pnpm workspaces + Turborepo**: All packages in `packages/` directory
- **Inter-package deps**: Use `workspace:*` protocol in package.json
- **Version catalogs**: Shared versions defined in `pnpm-workspace.yaml` (TypeScript, tsup, vitest)
- **Build order**: Turborepo handles dependency ordering via `turbo.json`

### Core Packages

1. **@agentcred-ai/sdk** (packages/sdk/) — Core library
   - 5 modules: types, identity, sign, verify, storage
   - Exports both ESM and CJS via tsup
   - 84 tests across 8 test files

2. **@agentcred-ai/cli** (packages/cli/) — Command-line interface
   - 4 commands: init, sign, verify, whoami
   - Uses Node.js built-in `parseArgs` (no external deps)
   - 27 tests across 5 test files

3. **@agentcred-ai/mcp-server** (packages/mcp-server/) — MCP integration
   - 4 tools + 2 resources
   - Uses `@modelcontextprotocol/sdk` with `StdioServerTransport`
   - 17 tests across 3 test files

4. **agentcred** (packages/agentcred/) — Convenience package
   - Zero-logic re-export of sdk
   - Enables `import { sign } from 'agentcred'`

5. **@agentcred-ai/api** (packages/api/) — Cloudflare Worker
   - Hono routing with KV storage
   - 19 tests using `@cloudflare/vitest-pool-workers`

6. **@agentcred-ai/vercel** (packages/vercel/) — Vercel AI SDK middleware
7. **@agentcred-ai/mastra** (packages/mastra/) — Mastra tool wrapper
8. **@agentcred-ai/website** (packages/website/) — Astro landing page

### Protocol Format

AgentCred envelopes contain:
```json
{
  "agentcred": {
    "v": "1.0",
    "jws": "eyJhbGci...",  // JWS compact serialization
    "github": "username",
    "agent": "agent-name"
  },
  "content": "signed content"
}
```

**JWS Structure**:
- Header: `{ alg: "EdDSA", typ: "agentcred+jwt", kid: "{github}@agentcred" }`
- Payload: `{ iss, sub, iat, content_hash (SHA-256), content_type, nonce }`
- Signature: Ed25519 via `jose` library

### Key Storage

- **FileSystemKeyStorage**: Stores keys in `~/.agentcred/keys/{username}.jwk`
- **MemoryKeyStorage**: For testing and browser environments
- **MCP server**: Defaults to FileSystemKeyStorage and can resolve identity via `GITHUB_USERNAME`

## Critical Technical Decisions

### TypeScript Configuration

- **Module resolution**: `NodeNext` (requires `.js` extensions in relative imports)
- **Build tool**: tsup generates both `.js` (ESM) and `.cjs` (CommonJS)
- **Package.json exports**: `types` field MUST come first before `import`/`require`
- **Strict mode**: All packages use TypeScript strict mode

### jose Library Specifics

- `generateKeyPair('EdDSA')` creates **non-extractable** keys by default
- MUST pass `{ extractable: true }` to export private keys
- JWS compact serialization (RFC 7515) for signatures

### CLI Implementation

- Uses Node.js `util.parseArgs` with `strict: false`
- Returns `string | true` for string options — requires runtime type guards
- No external argument parsing libraries

### Test Patterns

- Mock all external calls (GitHub API, AgentCred API, filesystem)
- Real Ed25519 keypairs in integration tests (not mock JWKs)
- Use `vi.stubGlobal('fetch', vi.fn())` for fetch mocking

## Known Gotchas

1. **tsup output extension**: Generates `.js` not `.mjs` — package.json exports must use `.js`
2. **parseArgs type safety**: Options return `string | true`, need guards before passing to functions expecting `string`
3. **Astro HTML**: `{}` treated as expressions — escape with `&#123;` / `&#125;`
4. **Mock patterns**: Tests use real Ed25519 keypairs in integration tests
5. **Package.json exports order**: `types` first, then `import`, then `require`

## Git Workflow

- **Conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`
- **Pre-commit hook**: `.husky/pre-commit` runs `pnpm test`
- **CI/CD**: GitHub Actions on push to `main`, PRs to `main`
  - `ci-test-integration.yml`: Build → Typecheck → Unit tests → Integration tests
  - Required secret: `AGENTCRED_GITHUB_TOKEN` (mapped to `GITHUB_TOKEN` env var)

## Documentation Protocol

**CRITICAL**: Always verify against source code before documenting.

1. Read implementation files (`src/*.ts`), type definitions, tests
2. Copy examples from tests or `examples/` directory
3. Verify function signatures, default values, return types
4. Cross-check against existing docs

Never document based on assumptions — read the actual code first.

## Package Versions

- SDK/MCP-Server/API: v0.1.3
- CLI/agentcred: v0.2.1
- Vercel/Mastra: v0.1.1
- Root package.json: `private: true`
