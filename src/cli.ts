import type { RunOptions } from './run'
import type { Services } from './services'
import { Command } from 'commander'
import pkg from '../package.json'

export const CLI_VERSION = pkg.version

export type ParsedCommand
  = | { type: 'chat', continue?: boolean }
    | { type: 'run', message: string[], options: RunOptions }
    | { type: 'auth:login', token: string, apiUrl?: string }
    | { type: 'auth:logout' }
    | { type: 'auth:status' }
    | { type: 'config:list' }
    | { type: 'config:get', key: string }
    | { type: 'config:set', key: string, value: string }
    | { type: 'upgrade', target?: string, method?: 'curl' | 'brew' }
    | { type: 'uninstall', keepData: boolean, dryRun: boolean, force: boolean }

export function createProgram(): Command {
  const program = new Command()

  program
    .name('wf')
    .description('WorkflowFiesta CLI - AI Agents for Your Entire Business')
    .version(CLI_VERSION)
    .option('-c, --continue', 'Resume the last conversation')

  // Chat command (default)
  program
    .command('chat', { isDefault: true })
    .description('Start the interactive chat')

  program
    .command('run')
    .description('Run with a message (non-interactive)')
    .argument('[message...]', 'Message to send')
    .option('-a, --agent <name>', 'Agent to use')
    .option('-c, --continue', 'Continue the last conversation')
    .option('-s, --session <id>', 'Conversation ID to continue')

  const auth = program
    .command('auth')
    .description('Authentication commands')

  auth
    .command('login')
    .description('Sign in with your access token')
    .requiredOption('-t, --token <token>', 'Access token from WorkflowFiesta web app')
    .option('-u, --api-url <url>', 'API URL for self-hosted instances')

  auth
    .command('logout')
    .description('Sign out and clear credentials')

  auth
    .command('status')
    .description('Show current authentication status')

  const config = program
    .command('config')
    .description('Configuration commands')

  config
    .command('set <key> <value>')
    .description('Set a configuration value')

  config
    .command('get <key>')
    .description('Get a configuration value')

  config
    .command('list')
    .description('List all configuration values')

  program
    .command('upgrade [target]')
    .description('Upgrade the WorkflowFiesta CLI to a newer version')
    .option('-m, --method <method>', 'Force installation method (curl, brew)')

  program
    .command('uninstall')
    .description('Uninstall WorkflowFiesta CLI')
    .option('--keep-data', 'Keep conversation data', false)
    .option('--dry-run', 'Show what would be removed without removing', false)
    .option('-f, --force', 'Skip confirmation prompt', false)

  return program
}

export function parseArgs(): ParsedCommand {
  const program = createProgram()

  let result: ParsedCommand = { type: 'chat' }

  // Override actions to capture context
  program.commands.find(c => c.name() === 'chat')?.action(() => {
    result = { type: 'chat' }
  })

  program.commands.find(c => c.name() === 'run')?.action((message: string[], opts) => {
    result = {
      type: 'run',
      message,
      options: {
        agent: opts.agent,
        continue: opts.continue,
        session: opts.session,
      },
    }
  })

  const authCmd = program.commands.find(c => c.name() === 'auth')
  authCmd?.commands.find(c => c.name() === 'login')?.action((opts) => {
    result = { type: 'auth:login', token: opts.token, apiUrl: opts.apiUrl }
  })
  authCmd?.commands.find(c => c.name() === 'logout')?.action(() => {
    result = { type: 'auth:logout' }
  })
  authCmd?.commands.find(c => c.name() === 'status')?.action(() => {
    result = { type: 'auth:status' }
  })

  const configCmd = program.commands.find(c => c.name() === 'config')
  configCmd?.commands.find(c => c.name() === 'set')?.action(() => {
    result = { type: 'config:set', key: program.args[2] ?? '', value: program.args[3] ?? '' }
  })
  configCmd?.commands.find(c => c.name() === 'get')?.action(() => {
    result = { type: 'config:get', key: program.args[2] ?? '' }
  })
  configCmd?.commands.find(c => c.name() === 'list')?.action(() => {
    result = { type: 'config:list' }
  })

  program.commands.find(c => c.name() === 'upgrade')?.action((target, opts) => {
    const method = opts.method as 'curl' | 'brew' | undefined
    if (method && method !== 'curl' && method !== 'brew') {
      console.error(`Invalid method: ${method}. Must be 'curl' or 'brew'.`)
      process.exit(1)
    }
    result = { type: 'upgrade', target: target || undefined, method }
  })

  program.commands.find(c => c.name() === 'uninstall')?.action((opts) => {
    result = {
      type: 'uninstall',
      keepData: opts.keepData ?? false,
      dryRun: opts.dryRun ?? false,
      force: opts.force ?? false,
    }
  })

  // Parse arguments
  try {
    program.parse()
  }
  catch {
    // Commander handles --help and --version
    process.exit(0)
  }

  if (result.type === 'chat') {
    const globalOpts = program.opts<{ continue?: boolean }>()
    result = { type: 'chat', continue: globalOpts.continue }
  }

  return result
}

/**
 * Execute non-TUI CLI commands. Returns true if a command was handled.
 */
export async function executeCommand(command: ParsedCommand, services: Services): Promise<boolean> {
  switch (command.type) {
    case 'auth:login': {
      if (!command.token) {
        console.error('Error: --token is required')
        console.error('Usage: wf auth login --token <your-token>')
        process.exit(1)
      }
      try {
        await services.auth.signIn(command.token, command.apiUrl)
        console.log('✓ Successfully signed in!')
        process.exit(0)
      }
      catch (error) {
        console.error('✗ Failed to sign in:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
      return true
    }

    case 'auth:logout': {
      await services.auth.signOut()
      console.log('✓ Successfully signed out.')
      process.exit(0)
      return true
    }

    case 'auth:status': {
      const isAuth = await services.auth.isAuthenticated()
      if (isAuth) {
        const fingerprint = await services.auth.getAccountFingerprint()
        console.log(`✓ Signed in (account: ${fingerprint})`)
      }
      else {
        console.log('✗ Not signed in.')
        console.log('  Run: wf auth login --token <your-token>')
      }
      process.exit(0)
      return true
    }

    case 'config:list': {
      const { getConfigManager } = await import('./config')
      const config = getConfigManager().getConfig()
      console.log(JSON.stringify(config, null, 2))
      process.exit(0)
      return true
    }

    case 'config:get': {
      if (!command.key) {
        console.error('Usage: wf config get <key>')
        process.exit(1)
      }
      const { getConfigManager } = await import('./config')
      const config = getConfigManager().getConfig()
      const value = config[command.key as keyof typeof config]
      if (value !== undefined) {
        console.log(value)
      }
      else {
        console.log('(not set)')
      }
      process.exit(0)
      return true
    }

    case 'config:set': {
      if (!command.key || command.value === undefined) {
        console.error('Usage: wf config set <key> <value>')
        process.exit(1)
      }
      const { getConfigManager } = await import('./config')
      getConfigManager().setConfig({ [command.key]: command.value })
      console.log(`✓ Set ${command.key} = ${command.value}`)
      process.exit(0)
      return true
    }

    case 'upgrade': {
      const { upgradeCommand } = await import('./installation')
      await upgradeCommand({
        target: command.target,
        forceMethod: command.method,
      })
      return true
    }

    case 'uninstall': {
      const { uninstallCommand } = await import('./installation')
      await uninstallCommand({
        keepData: command.keepData,
        dryRun: command.dryRun,
        force: command.force,
      })
      return true
    }

    case 'run': {
      const { runCommand } = await import('./run')
      await runCommand(command.message, command.options, services)
      return true
    }

    case 'chat':
      // Chat command is handled by TUI
      return false

    default:
      return false
  }
}
