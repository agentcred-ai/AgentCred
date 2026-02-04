import { parseArgs } from 'node:util'
import * as fs from 'node:fs/promises'
import { verify, verifyOffline, type AgentCredEnvelope } from '@agentcred-ai/sdk'
import { importJWK } from 'jose'

const HELP = `agentcred verify — Verify an AgentCred envelope

Usage: agentcred verify [file] [options]
       cat envelope.json | agentcred verify

Options:
  --offline        Verify offline using a local public key
  --key <path>     Path to public key JWK file (used with --offline)
  --json           Output result as JSON (for programmatic use)
  --help, -h       Show this help message

If no file is given, reads from stdin.`

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

export async function verifyCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP)
    return
  }

  const { values, positionals } = parseArgs({
    args,
    options: {
      offline: { type: 'boolean', default: false },
      key: { type: 'string' },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: false,
  })

  const filePath = positionals[0]
  let input: string

  if (filePath) {
    input = await fs.readFile(filePath, 'utf-8')
  } else if (!process.stdin.isTTY) {
    input = await readStdin()
  } else {
    throw new Error('No input provided. Pass a file argument or pipe content via stdin.')
  }

  let envelope: AgentCredEnvelope
  try {
    envelope = JSON.parse(input) as AgentCredEnvelope
  } catch {
    throw new Error('Invalid JSON input. Expected an AgentCred envelope.')
  }

  if (!envelope.agentcred?.jws) {
    throw new Error('Invalid envelope: missing agentcred.jws field.')
  }

  let result
  if (values.offline) {
    if (!values.key) {
      throw new Error('--key <path> is required when using --offline')
    }
    if (typeof values.key !== 'string') {
      throw new Error('Invalid key: --key flag must be provided with a file path')
    }
    const keyData = await fs.readFile(values.key, 'utf-8')
    const jwkData = JSON.parse(keyData) as Record<string, unknown>
    const { d: _privateKey, ...publicJWK } = jwkData
    const publicKey = await importJWK(publicJWK as JsonWebKey, 'EdDSA')
    result = await verifyOffline(envelope, publicKey)
  } else {
    result = await verify(envelope)
  }

  // Output handling — only once
  if (values.json) {
    console.log(JSON.stringify(result, null, 2))
    if (!result.verified) process.exit(1)
  } else if (result.verified) {
    console.log(`\u2713 Verified: @${result.github?.username} (${result.agent}) at ${result.signedAt}`)
  } else {
    console.error(`\u2717 Verification failed: ${result.error}`)
    process.exit(1)
  }
}
