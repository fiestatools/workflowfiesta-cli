import type { Services } from '../services'
import { log } from '@clack/prompts'
import color from 'picocolors'
import { logger } from '../logger'

export interface AuthLoginOptions {
  token?: string
  apiUrl?: string
  env?: string
  name?: string
  skipValidation?: boolean
}

const ENVIRONMENT_URLS: Record<string, string> = {
  staging: 'https://staging.api.workflowfiesta.com',
  production: 'https://api.workflowfiesta.com',
}

export interface AuthSwitchOptions {
  name: string
}

export interface AuthRemoveOptions {
  name: string
}

export async function authLogin(options: AuthLoginOptions, services: Services): Promise<void> {
  try {
    // Resolve the effective API URL. --api-url always takes precedence over --env.
    let apiUrl = options.apiUrl
    if (options.env) {
      const env = options.env.trim().toLowerCase()
      const envUrl = ENVIRONMENT_URLS[env]
      if (!envUrl) {
        log.error(`Invalid environment "${options.env}". Valid values: ${Object.keys(ENVIRONMENT_URLS).join(', ')}`)
        process.exit(1)
      }
      if (options.apiUrl) {
        log.warn('Both --api-url and --env provided; using --api-url and ignoring --env.')
      }
      else {
        apiUrl = envUrl
      }
    }

    if (options.token) {
      await services.auth.signIn(options.token, apiUrl, options.name, options.skipValidation)
    }
    else {
      log.info('Opening browser to sign in to WorkflowFiesta...')
      await services.auth.signInWithBrowser(apiUrl, options.name)
    }
    if (options.name) {
      log.success(`Successfully signed in as "${options.name}"!`)
    }
    else {
      log.success('Successfully signed in!')
    }
  }
  catch (error) {
    logger.error('auth login failed', {
      error: error instanceof Error ? error.message : String(error),
      hasToken: !!options.token,
      hasApiUrlOverride: !!options.apiUrl,
      accountName: options.name,
    })
    log.error(`Failed to sign in: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

export async function authLogout(services: Services): Promise<void> {
  await services.auth.signOut()
  log.success('Successfully signed out.')
  process.exit(0)
}

export async function authStatus(services: Services): Promise<void> {
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
}

export async function authList(services: Services): Promise<void> {
  const accounts = await services.auth.getAccounts()
  const activeAccount = await services.auth.getActiveAccountName()

  if (accounts.length === 0) {
    log.info('No accounts configured.')
    log.message('Run: wf auth login --token <your-token> --name <account-name>', { symbol: color.cyan('i') })
    process.exit(0)
    return
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
}

export async function authSwitch(options: AuthSwitchOptions, services: Services): Promise<void> {
  if (!options.name) {
    log.error('Account name is required')
    log.message('Usage: wf auth switch <account-name>', { symbol: color.cyan('i') })
    process.exit(1)
  }
  const success = await services.auth.switchAccount(options.name)
  if (success) {
    log.success(`Switched to account "${options.name}"`)
    process.exit(0)
  }
  else {
    log.error(`Account "${options.name}" not found.`)
    log.message('Run: wf auth list', { symbol: color.cyan('i') })
    process.exit(1)
  }
}

export async function authRemove(options: AuthRemoveOptions, services: Services): Promise<void> {
  if (!options.name) {
    log.error('Account name is required')
    log.message('Usage: wf auth remove <account-name>', { symbol: color.cyan('i') })
    process.exit(1)
  }
  const success = await services.auth.removeAccount(options.name)
  if (success) {
    log.success(`Removed account "${options.name}"`)
    process.exit(0)
  }
  else {
    log.error(`Account "${options.name}" not found.`)
    log.message('Run: wf auth list', { symbol: color.cyan('i') })
    process.exit(1)
  }
}
