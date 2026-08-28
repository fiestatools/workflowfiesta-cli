import type { RunOptions } from './run'
import type { Services } from './services'
import { log } from '@clack/prompts'
import { Command } from 'commander'
import color from 'picocolors'
import pkg from '../package.json'
import {
  authList,
  authLogin,
  authLogout,
  authRemove,
  authStatus,
  authSwitch,
  configGet,
  configList,
  configSet,
  run,
  skillCreate,
  skillList,
  skillShow,
  skillSync,
  skillValidate,
  uninstall,
  upgrade,
} from './commands'

export const CLI_VERSION = pkg.version

export type ParsedCommand
  = | { type: 'chat', continue?: boolean, session?: string, title?: string }
    | { type: 'run', message: string[], options: RunOptions }
    | { type: 'auth:login', token?: string, apiUrl?: string, name?: string, skipValidation?: boolean }
    | { type: 'auth:logout' }
    | { type: 'auth:status' }
    | { type: 'auth:list' }
    | { type: 'auth:switch', name: string }
    | { type: 'auth:remove', name: string }
    | { type: 'config:list' }
    | { type: 'config:get', key: string }
    | { type: 'config:set', key: string, value: string }
    | { type: 'upgrade', target?: string, method?: 'curl' | 'brew' }
    | { type: 'uninstall', keepData: boolean, dryRun: boolean, force: boolean }
    | { type: 'skill:list' }
    | { type: 'skill:show', name: string }
    | { type: 'skill:create', name: string, description: string }
    | { type: 'skill:validate', path: string }
    | { type: 'skill:sync' }

const COMMAND_SUGGESTIONS: Record<string, string> = {
  'login': 'wf auth login [--token <your-token>]',
  'logout': 'wf auth logout',
  'status': 'wf auth status',
  'signin': 'wf auth login --token <your-token>',
  'signout': 'wf auth logout',
  'sign-in': 'wf auth login --token <your-token>',
  'sign-out': 'wf auth logout',
  'accounts': 'wf auth list',
  'switch': 'wf auth switch <account-name>',
  'set': 'wf config set <key> <value>',
  'get': 'wf config get <key>',
  'list': 'wf config list',
}

function printUnknownCommandError(command: string): void {
  const suggestion = COMMAND_SUGGESTIONS[command.toLowerCase()]
  log.error(`Unknown command '${command}'.`)
  if (suggestion) {
    log.message(`Did you mean: ${suggestion}`, { symbol: color.cyan('?') })
  }
  log.message(`Run 'wf --help' for usage information.`, { symbol: color.cyan('i') })
  process.exit(1)
}

export function createProgram(): Command {
  const program = new Command()

  program
    .name('wf')
    .description('WorkflowFiesta CLI - AI Agents for Your Entire Business')
    .version(CLI_VERSION)
    .option('-c, --continue', 'Resume the last conversation')
    .option('-s, --session <id>', 'Resume a specific conversation by ID')
    .option('--title <title>', 'Set the terminal title (defaults to the conversation title)')
    .allowExcessArguments(true)
    .enablePositionalOptions()

  program
    .command('run')
    .description('Run with a message (non-interactive)')
    .argument('[message...]', 'Message to send')
    .option('-a, --agent <name>', 'Agent to use')
    .option('-c, --continue', 'Continue the last conversation')
    .option('-s, --session <id>', 'Conversation ID to continue')
    .option('--copy', 'Copy the final response to clipboard')

  const auth = program
    .command('auth')
    .description('Authentication commands')

  auth
    .command('login')
    .description('Sign in through your browser or with an access token')
    .option('-t, --token <token>', 'Access token from WorkflowFiesta web app')
    .option('-u, --api-url <url>', 'API URL for self-hosted instances')
    .option('-n, --name <name>', 'Account name (e.g., "prod", "staging", "local")')
    .option('--skip-validation', 'Skip token validation (for testing only)')

  auth
    .command('logout')
    .description('Sign out and clear credentials')

  auth
    .command('status')
    .description('Show current authentication status')

  auth
    .command('list')
    .alias('ls')
    .description('List all stored accounts')

  auth
    .command('switch <name>')
    .description('Switch to a different account')

  auth
    .command('remove <name>')
    .alias('rm')
    .description('Remove a stored account')

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

  const skill = program
    .command('skill')
    .description('Manage skills (modular agent instruction bundles)')

  skill
    .command('list')
    .alias('ls')
    .description('List all discovered skills (local + cloud-installed)')

  skill
    .command('show <name>')
    .description('Show skill details and content')

  skill
    .command('create <name>')
    .description('Scaffold a new skill directory')
    .option('-d, --description <desc>', 'Short description', 'A new skill')

  skill
    .command('validate [path]')
    .description('Validate a SKILL.md file')

  skill
    .command('sync')
    .description('Sync local skills with the cloud (push local, pull remote)')

  return program
}

export function parseArgs(): ParsedCommand {
  const program = createProgram()

  let result: ParsedCommand = { type: 'chat' }

  program.action(function (this: Command) {
    if (this.args.length > 0) {
      // User passed arguments without a valid command (e.g., "wf login")
      printUnknownCommandError(this.args[0] as string)
    }
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
        copy: opts.copy,
      },
    }
  })

  const authCmd = program.commands.find(c => c.name() === 'auth')
  authCmd?.commands.find(c => c.name() === 'login')?.action((opts) => {
    result = {
      type: 'auth:login',
      token: opts.token,
      apiUrl: opts.apiUrl,
      name: opts.name,
      skipValidation: opts.skipValidation,
    }
  })
  authCmd?.commands.find(c => c.name() === 'logout')?.action(() => {
    result = { type: 'auth:logout' }
  })
  authCmd?.commands.find(c => c.name() === 'status')?.action(() => {
    result = { type: 'auth:status' }
  })
  authCmd?.commands.find(c => c.name() === 'list')?.action(() => {
    result = { type: 'auth:list' }
  })
  authCmd?.commands.find(c => c.name() === 'switch')?.action((name) => {
    result = { type: 'auth:switch', name }
  })
  authCmd?.commands.find(c => c.name() === 'remove')?.action((name) => {
    result = { type: 'auth:remove', name }
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
      log.error(`Invalid method: ${method}. Must be 'curl' or 'brew'.`)
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

  const skillCmd = program.commands.find(c => c.name() === 'skill')
  skillCmd?.commands.find(c => c.name() === 'list')?.action(() => {
    result = { type: 'skill:list' }
  })
  skillCmd?.commands.find(c => c.name() === 'show')?.action((name) => {
    result = { type: 'skill:show', name }
  })
  skillCmd?.commands.find(c => c.name() === 'create')?.action((name, opts) => {
    result = { type: 'skill:create', name, description: opts.description ?? 'A new skill' }
  })
  skillCmd?.commands.find(c => c.name() === 'validate')?.action((path) => {
    result = { type: 'skill:validate', path: path ?? 'SKILL.md' }
  })
  skillCmd?.commands.find(c => c.name() === 'sync')?.action(() => {
    result = { type: 'skill:sync' }
  })

  program.showHelpAfterError(false)
  program.exitOverride()
  program.configureOutput({ writeErr: () => {} })

  try {
    program.parse()
  }
  catch (err: unknown) {
    const error = err as { code?: string, message?: string }
    if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
      process.exit(0)
    }
    if (error.message) {
      log.error(error.message)
    }
    process.exit(1)
  }

  if (result.type === 'chat') {
    const globalOpts = program.opts<{ continue?: boolean, session?: string, title?: string }>()
    if (globalOpts.continue && globalOpts.session) {
      log.error('--continue and --session are mutually exclusive')
      process.exit(1)
    }
    result = {
      type: 'chat',
      continue: globalOpts.continue,
      session: globalOpts.session,
      title: globalOpts.title,
    }
  }

  return result
}

/**
 * Execute non-TUI CLI commands. Returns true if a command was handled.
 */
export async function executeCommand(command: ParsedCommand, services: Services): Promise<boolean> {
  switch (command.type) {
    case 'auth:login':
      await authLogin({
        token: command.token,
        apiUrl: command.apiUrl,
        name: command.name,
        skipValidation: command.skipValidation,
      }, services)
      return false

    case 'auth:logout':
      await authLogout(services)
      return true

    case 'auth:status':
      await authStatus(services)
      return true

    case 'auth:list':
      await authList(services)
      return true

    case 'auth:switch':
      await authSwitch({ name: command.name }, services)
      return true

    case 'auth:remove':
      await authRemove({ name: command.name }, services)
      return true

    case 'config:list':
      await configList()
      return true

    case 'config:get':
      await configGet({ key: command.key })
      return true

    case 'config:set':
      await configSet({ key: command.key, value: command.value })
      return true

    case 'upgrade':
      await upgrade({ target: command.target, method: command.method })
      return true

    case 'uninstall':
      await uninstall({
        keepData: command.keepData,
        dryRun: command.dryRun,
        force: command.force,
      })
      return true

    case 'run':
      await run(command.message, command.options, services)
      return true

    case 'skill:list':
      await skillList()
      return true

    case 'skill:show':
      await skillShow({ name: command.name })
      return true

    case 'skill:create':
      await skillCreate({ name: command.name, description: command.description })
      return true

    case 'skill:validate':
      await skillValidate({ path: command.path })
      return true

    case 'skill:sync':
      await skillSync(services)
      return true

    case 'chat':
      // Chat command is handled by TUI
      return false

    default:
      return false
  }
}
