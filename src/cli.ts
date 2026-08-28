import type { RunOptions } from './run'
import type { Services } from './services'
import { log } from '@clack/prompts'
import { Command } from 'commander'
import color from 'picocolors'
import pkg from '../package.json'
import { logger } from './logger'

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
    case 'auth:login': {
      try {
        if (command.token) {
          await services.auth.signIn(command.token, command.apiUrl, command.name, command.skipValidation)
        }
        else {
          log.info('Opening browser to sign in to WorkflowFiesta...')
          await services.auth.signInWithBrowser(command.apiUrl, command.name)
        }
        if (command.name) {
          log.success(`Successfully signed in as "${command.name}"!`)
        }
        else {
          log.success('Successfully signed in!')
        }
        return false
      }
      catch (error) {
        logger.error('auth login failed', {
          error: error instanceof Error ? error.message : String(error),
          hasToken: !!command.token,
          hasApiUrlOverride: !!command.apiUrl,
          accountName: command.name,
        })
        log.error(`Failed to sign in: ${error instanceof Error ? error.message : error}`)
        process.exit(1)
        return true
      }
    }

    case 'auth:logout': {
      await services.auth.signOut()
      log.success('Successfully signed out.')
      process.exit(0)
      return true
    }

    case 'auth:status': {
      const isAuth = await services.auth.isAuthenticated()
      if (isAuth) {
        const fingerprint = await services.auth.getAccountFingerprint()
        const accountName = await services.auth.getActiveAccountName()
        if (accountName) {
          log.success(`Signed in as "${accountName}" (account: ${fingerprint})`)
        }
        else {
          log.success(`Signed in (account: ${fingerprint})`)
        }
      }
      else {
        log.warn('Not signed in.')
        log.message('Run: wf auth login --token <your-token>', { symbol: color.cyan('i') })
      }
      process.exit(0)
      return true
    }

    case 'auth:list': {
      const accounts = await services.auth.getAccounts()
      const activeAccount = await services.auth.getActiveAccountName()

      if (accounts.length === 0) {
        log.info('No accounts configured.')
        log.message('Run: wf auth login --token <your-token> --name <account-name>', { symbol: color.cyan('i') })
        process.exit(0)
        return true
      }

      log.info('Accounts:')
      for (const account of accounts) {
        const isActive = account.name === activeAccount
        const marker = isActive ? '* ' : '  '
        const urlSuffix = account.apiUrlOverride ? ` (${account.apiUrlOverride})` : ''
        log.message(`${marker}${account.name}${urlSuffix}`, { symbol: ' ' })
      }
      log.message('', { symbol: ' ' })
      log.message('* = active account', { symbol: ' ' })
      log.message('Switch: wf auth switch <name>', { symbol: color.cyan('i') })
      process.exit(0)
      return true
    }

    case 'auth:switch': {
      if (!command.name) {
        log.error('Account name is required')
        log.message('Usage: wf auth switch <account-name>', { symbol: color.cyan('i') })
        process.exit(1)
      }
      const success = await services.auth.switchAccount(command.name)
      if (success) {
        log.success(`Switched to account "${command.name}"`)
        process.exit(0)
      }
      else {
        log.error(`Account "${command.name}" not found.`)
        log.message('Run: wf auth list', { symbol: color.cyan('i') })
        process.exit(1)
      }
      return true
    }

    case 'auth:remove': {
      if (!command.name) {
        log.error('Account name is required')
        log.message('Usage: wf auth remove <account-name>', { symbol: color.cyan('i') })
        process.exit(1)
      }
      const success = await services.auth.removeAccount(command.name)
      if (success) {
        log.success(`Removed account "${command.name}"`)
        process.exit(0)
      }
      else {
        log.error(`Account "${command.name}" not found.`)
        log.message('Run: wf auth list', { symbol: color.cyan('i') })
        process.exit(1)
      }
      return true
    }

    case 'config:list': {
      const { getConfigManager } = await import('./config')
      const config = getConfigManager().getConfig()
      log.info(JSON.stringify(config, null, 2))
      process.exit(0)
      return true
    }

    case 'config:get': {
      if (!command.key) {
        log.error('Usage: wf config get <key>')
        process.exit(1)
      }
      const { getConfigManager } = await import('./config')
      const config = getConfigManager().getConfig()
      const value = config[command.key as keyof typeof config]
      if (value !== undefined) {
        log.info(String(value))
      }
      else {
        log.info('(not set)')
      }
      process.exit(0)
      return true
    }

    case 'config:set': {
      if (!command.key || command.value === undefined) {
        log.error('Usage: wf config set <key> <value>')
        process.exit(1)
      }
      const { getConfigManager } = await import('./config')
      getConfigManager().setConfig({ [command.key]: command.value })
      log.success(`Set ${command.key} = ${command.value}`)
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

    case 'skill:list': {
      const { getSkillService } = await import('./skill')
      const skillService = getSkillService()
      await skillService.loadAll()
      const skills = skillService.all()
      if (skills.length === 0) {
        log.info('No skills found.')
        log.message('Create one with: wf skill create <name>', { symbol: color.cyan('i') })
        log.message('Skills are loaded from .agents/skills/ and .claude/skills/', { symbol: color.cyan('i') })
      }
      else {
        const maxName = Math.max(...skills.map(s => s.name.length))
        const maxSource = Math.max(...skills.map(s => s.source.length))
        for (const skill of skills) {
          const ver = skill.frontmatter.version ? ` v${skill.frontmatter.version}` : ''
          log.message(
            `${skill.name.padEnd(maxName)}  ${skill.source.padEnd(maxSource)}  ${skill.description}${ver}`,
            { symbol: ' ' },
          )
        }
        log.info(`${skills.length} skill(s) found.`)
      }
      process.exit(0)
      return true
    }

    case 'skill:show': {
      const { getSkillService } = await import('./skill')
      const skillService = getSkillService()
      await skillService.loadAll()
      const skill = skillService.get(command.name)
      if (!skill) {
        log.error(`Skill "${command.name}" not found.`)
        log.message('Run: wf skill list', { symbol: color.cyan('i') })
        process.exit(1)
      }
      log.info(`Name:        ${skill.name}`)
      log.message(`Description: ${skill.description}`, { symbol: ' ' })
      log.message(`Source:      ${skill.source}`, { symbol: ' ' })
      log.message(`Path:        ${skill.path}`, { symbol: ' ' })
      if (skill.frontmatter.version)
        log.message(`Version:     ${skill.frontmatter.version}`, { symbol: ' ' })
      if (skill.frontmatter.author)
        log.message(`Author:      ${skill.frontmatter.author}`, { symbol: ' ' })
      if (skill.frontmatter.tags?.length)
        log.message(`Tags:        ${skill.frontmatter.tags.join(', ')}`, { symbol: ' ' })
      if (skill.frontmatter.tools?.length)
        log.message(`Tools:       ${skill.frontmatter.tools.join(', ')}`, { symbol: ' ' })
      log.message(`\n--- Content ---\n`, { symbol: ' ' })
      log.message(skill.body, { symbol: ' ' })
      process.exit(0)
      return true
    }

    case 'skill:create': {
      const { getSkillService } = await import('./skill')
      const skillService = getSkillService()
      const dir = await skillService.create(command.name, command.description)
      log.success(`Created skill "${command.name}" at ${dir}`)
      log.message(`Edit ${dir}/SKILL.md to add instructions.`, { symbol: color.cyan('i') })
      process.exit(0)
      return true
    }

    case 'skill:validate': {
      const { resolve } = await import('node:path')
      const { getSkillService } = await import('./skill')
      const skillService = getSkillService()
      const absPath = resolve(command.path)
      const result = await skillService.validate(absPath)
      if (result.valid) {
        log.success(`${absPath} is valid.`)
      }
      else {
        log.error(`${absPath} has errors:`)
        for (const err of result.errors) {
          log.message(`- ${err}`, { symbol: ' ' })
        }
        process.exit(1)
      }
      process.exit(0)
      return true
    }

    case 'skill:sync': {
      const { getSkillService, SkillCloudClient } = await import('./skill')
      const skillService = getSkillService()
      await skillService.loadAll()
      const localSkills = skillService.all()
      const cloud = new SkillCloudClient(services.api)
      const result = await cloud.sync(localSkills)

      if (result.uploaded.length > 0) {
        log.step(`Uploaded ${result.uploaded.length} skill(s):`)
        for (const name of result.uploaded) {
          log.message(`  ${name}`, { symbol: color.green('^') })
        }
      }
      if (result.downloaded.length > 0) {
        log.step(`Downloaded ${result.downloaded.length} skill(s):`)
        for (const name of result.downloaded) {
          log.message(`  ${name}`, { symbol: color.blue('v') })
        }
      }
      if (result.uploaded.length === 0 && result.downloaded.length === 0) {
        log.success('Skills are in sync. No changes needed.')
      }
      process.exit(0)
      return true
    }

    case 'chat':
      // Chat command is handled by TUI
      return false

    default:
      return false
  }
}
