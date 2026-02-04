import { parseArgs } from 'node:util'
import * as fs from 'node:fs/promises'
import { loadIdentity, sign, FileSystemKeyStorage } from '@agentcred-ai/sdk'

const HELP = `agentcred sign — Sign content with your AgentCred identity

Usage: agentcred sign [file] [options]
       cat file.txt | agentcred sign

Options:
  --agent <name>  Agent name (default: "default")
  --help, -h      Show this help message

If no file is given, reads from stdin.`

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

export async function signCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP)
    return
  }

  const { values, positionals } = parseArgs({
    args,
    options: {
      agent: { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  const filePath = positionals[0]
  let content: string

  if (filePath) {
    content = await fs.readFile(filePath, 'utf-8')
  } else if (!process.stdin.isTTY) {
    content = await readStdin()
  } else {
    throw new Error('No input provided. Pass a file argument or pipe content via stdin.')
  }

  const storage = new FileSystemKeyStorage()
  const usernames = await storage.list()

  if (usernames.length === 0) {
    throw new Error("No identity found. Run 'agentcred init' first.")
  }

  const username = usernames[0]
  const loaded = await loadIdentity(username, { storage })

  if (!loaded) {
    throw new Error("No identity found. Run 'agentcred init' first.")
  }

  const envelope = await sign(content, {
    privateKey: loaded.privateKey,
    github: username,
  }, { agent: values.agent as string | undefined })

  console.log(JSON.stringify(envelope, null, 2))
}
