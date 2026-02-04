import { parseArgs } from 'node:util'
import { createIdentity, FileSystemKeyStorage, startDeviceFlow } from '@agentcred-ai/sdk'

const HELP = `agentcred init — Initialize identity with GitHub

Usage: agentcred init              (authenticates via GitHub OAuth — opens browser)
       agentcred init --token <t>  (authenticates with personal access token)

Options:
  --token <token>  GitHub personal access token (skips OAuth)
                   (or set GITHUB_TOKEN environment variable)
  --json           Output result as JSON (for programmatic use)
  --help, -h       Show this help message`

export async function initCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP)
    return
  }

  const { values } = parseArgs({
    args,
    options: {
      token: { type: 'string' },
      json: { type: 'boolean', default: false },
    },
    strict: false,
  })

  const token = values.token ?? process.env['GITHUB_TOKEN']

  let githubToken: string
  if (token) {
    // PAT provided via flag or env var
    if (typeof token !== 'string') {
      throw new Error('Invalid token: --token flag must be provided with a value')
    }
    githubToken = token
  } else {
    // Default to OAuth Device Flow
    githubToken = await startDeviceFlow({
      onUserCode: (code, verificationUri) => {
        console.log(`! First, copy your one-time code: ${code}`)
        console.log(`Then press Enter to open ${verificationUri} in your browser...`)
      },
    })
  }

  const storage = new FileSystemKeyStorage()
  const identity = await createIdentity(githubToken, { storage })

  if (values.json) {
    console.log(JSON.stringify({
      username: identity.github.username,
      fingerprint: identity.fingerprint,
      registeredAt: identity.registeredAt,
    }, null, 2))
  } else {
    console.log(`\u2713 Identity created for @${identity.github.username}`)
  }
}
