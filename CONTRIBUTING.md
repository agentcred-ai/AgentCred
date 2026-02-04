# Contributing to AgentCred

First off, thank you for considering contributing to AgentCred! It's people like you that make AgentCred such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [pnpm](https://pnpm.io/) (v10 or later)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/agentcred/agentcred.git
   cd agentcred
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the project:
   ```bash
   pnpm build
   ```

4. Run tests to ensure everything is working:
   ```bash
   pnpm test
   ```

## Development Workflow

### Monorepo Structure

AgentCred is managed as a monorepo using pnpm workspaces and Turbo:

- `packages/sdk`: Core library for signing and verification.
- `packages/cli`: Command-line interface.
- `packages/mcp-server`: Model Context Protocol server.
- `packages/api`: Backend service for key registration.
- `packages/agentcred`: Convenience wrapper package.

### Code Style

- We use **TypeScript** for all packages.
- We follow **ESM** first, with CJS compatibility where necessary.
- Code should be clean, documented, and covered by tests.

### Testing

Each package has its own test suite. You can run all tests from the root:

```bash
pnpm test
```

Or run tests for a specific package:

```bash
pnpm --filter @agentcred-ai/sdk test
```

## Pull Request Process

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and ensure tests pass.
3. Commit your changes using descriptive commit messages.
4. Push your branch to GitHub.
5. Open a Pull Request against the `main` branch.
6. Once the PR is approved and all checks pass, it will be merged.

## Questions?

If you have any questions, feel free to open an issue or reach out to the maintainers.

Happy coding!
