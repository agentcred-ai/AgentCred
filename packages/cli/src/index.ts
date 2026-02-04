import { parseArgs } from 'node:util'
import { initCommand } from './commands/init.js'
import { signCommand } from './commands/sign.js'
import { verifyCommand } from './commands/verify.js'
import { whoamiCommand } from './commands/whoami.js'

declare const PKG_VERSION: string
export const version: string = PKG_VERSION

const HELP = `agentcred v${version} — Human accountability badge for AI agents

Usage: agentcred <command> [options]

Commands:
  init      Initialize identity with GitHub token
  sign      Sign content (file or stdin)
  verify    Verify an AgentCred envelope (file or stdin)
  whoami    Show current identity

Options:
  --help, -h     Show this help message
  --version, -v  Show version

Run 'agentcred <command> --help' for command-specific help.`

type Command = (args: string[]) => Promise<void>

const commands: Record<string, Command> = {
  init: initCommand,
  sign: signCommand,
  verify: verifyCommand,
  whoami: whoamiCommand,
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      console.log(HELP)
      process.exit(0)
    }
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(version)
    process.exit(0)
  }

  const commandName = args[0]
  const commandArgs = args.slice(1)

  const command = commands[commandName]
  if (!command) {
    console.error(`Unknown command: ${commandName}`)
    console.error(`Run 'agentcred --help' for available commands.`)
    process.exit(1)
  }

  try {
    await command(commandArgs)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\u2717 ${message}`)
    process.exit(1)
  }
}

export { main }

if (!process.env['VITEST']) {
  main()
}
