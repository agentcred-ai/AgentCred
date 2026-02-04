import { parseArgs } from 'node:util'
import { FileSystemKeyStorage } from '@agentcred-ai/sdk'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

const HELP = `agentcred whoami — Show current identity

Usage: agentcred whoami

Options:
  --json        Output result as JSON (for programmatic use)
  --help, -h    Show this help message`

export async function whoamiCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP)
    return
  }

  const { values } = parseArgs({
    args,
    options: {
      json: { type: 'boolean', default: false },
    },
    strict: false,
  })

  const storage = new FileSystemKeyStorage()
  const usernames = await storage.list()

  if (usernames.length === 0) {
    throw new Error("No identity configured. Run 'agentcred init' first.")
  }

  const username = usernames[0]
  const keyDir = path.join(os.homedir(), '.agentcred', 'keys')
  const keyPath = path.join(keyDir, `${username}.jwk`)

  try {
    const keyData = await fs.readFile(keyPath, 'utf-8')
    const privateJWK = JSON.parse(keyData) as JsonWebKey

    // Compute fingerprint from the public portion
    const { d: _d, ...publicPortion } = privateJWK as JsonWebKey & { d?: string }
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(publicPortion))
      .digest('hex')
      .slice(0, 16)

    if (values.json) {
      console.log(JSON.stringify({ username, fingerprint, keyPath }, null, 2))
    } else {
      console.log(`You are @${username} (fingerprint: ${fingerprint})`)
    }
  } catch {
    throw new Error("No identity configured. Run 'agentcred init' first.")
  }
}
