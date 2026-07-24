import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logger } from '../logger'

export interface StoredAccount {
  name: string
  token: string
  apiUrlOverride?: string
}

interface StoredCredentials {
  token?: string
  /** Legacy API URL override (for backwards compatibility). */
  apiUrlOverride?: string
  accounts?: StoredAccount[]
  activeAccount?: string
}

/**
 * File-based credential storage for the CLI.
 *
 * Stores credentials in `~/.config/workflowfiesta/cli/credentials.json`.
 * File permissions are set to 0600 (owner read/write only).
 */
export class CredentialStore {
  private readonly credentialsPath: string

  constructor(configDir?: string) {
    const baseDir = configDir ?? join(homedir(), '.config', 'workflowfiesta', 'cli')
    this.credentialsPath = join(baseDir, 'credentials.json')

    // Ensure the config directory exists
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true, mode: 0o700 })
    }
  }

  /** Get the stored access token for the active account. */
  async getToken(): Promise<string | undefined> {
    const credentials = this.readCredentials()
    if (credentials.activeAccount && credentials.accounts) {
      const account = credentials.accounts.find(a => a.name === credentials.activeAccount)
      return account?.token
    }
    // Fall back to legacy single token
    return credentials.token
  }

  async setToken(token: string): Promise<void> {
    const credentials = this.readCredentials()
    if (credentials.activeAccount && credentials.accounts) {
      const accountIndex = credentials.accounts.findIndex(a => a.name === credentials.activeAccount)
      if (accountIndex >= 0) {
        credentials.accounts[accountIndex]!.token = token
      }
    }
    else {
      credentials.token = token
    }
    this.writeCredentials(credentials)
  }

  async clearToken(): Promise<void> {
    const credentials = this.readCredentials()
    if (credentials.activeAccount && credentials.accounts) {
      const accountIndex = credentials.accounts.findIndex(a => a.name === credentials.activeAccount)
      if (accountIndex >= 0) {
        credentials.accounts.splice(accountIndex, 1)
        credentials.activeAccount = credentials.accounts[0]?.name
      }
    }
    else {
      delete credentials.token
    }
    this.writeCredentials(credentials)
  }

  async getApiUrlOverride(): Promise<string | undefined> {
    const credentials = this.readCredentials()
    if (credentials.activeAccount && credentials.accounts) {
      const account = credentials.accounts.find(a => a.name === credentials.activeAccount)
      return account?.apiUrlOverride
    }
    return credentials.apiUrlOverride
  }

  /** Store the API URL override. */
  async setApiUrlOverride(url: string): Promise<void> {
    logger.debug('setApiUrlOverride', { url })
    const credentials = this.readCredentials()
    if (credentials.activeAccount && credentials.accounts) {
      const accountIndex = credentials.accounts.findIndex(a => a.name === credentials.activeAccount)
      if (accountIndex >= 0) {
        credentials.accounts[accountIndex]!.apiUrlOverride = url
      }
    }
    else {
      credentials.apiUrlOverride = url
    }
    this.writeCredentials(credentials)
  }

  async clearApiUrlOverride(): Promise<void> {
    logger.debug('clearApiUrlOverride')
    const credentials = this.readCredentials()
    if (credentials.activeAccount && credentials.accounts) {
      const accountIndex = credentials.accounts.findIndex(a => a.name === credentials.activeAccount)
      if (accountIndex >= 0) {
        delete credentials.accounts[accountIndex]!.apiUrlOverride
      }
    }
    else {
      delete credentials.apiUrlOverride
    }
    this.writeCredentials(credentials)
  }

  async clearAll(): Promise<void> {
    if (existsSync(this.credentialsPath)) {
      unlinkSync(this.credentialsPath)
    }
  }

  async getAccounts(): Promise<StoredAccount[]> {
    const credentials = this.readCredentials()
    // If using legacy format (no accounts or empty accounts array), convert to account format
    if ((!credentials.accounts || credentials.accounts.length === 0) && credentials.token) {
      return [{
        name: 'default',
        token: credentials.token,
        apiUrlOverride: credentials.apiUrlOverride,
      }]
    }
    return credentials.accounts ?? []
  }

  async getActiveAccountName(): Promise<string | undefined> {
    const credentials = this.readCredentials()
    if (credentials.activeAccount) {
      return credentials.activeAccount
    }
    // If using legacy format with a token (no accounts or empty), treat as "default"
    if ((!credentials.accounts || credentials.accounts.length === 0) && credentials.token) {
      return 'default'
    }
    return undefined
  }

  async setAccount(account: StoredAccount): Promise<void> {
    logger.debug('setAccount', { name: account.name })
    const credentials = this.readCredentials()

    // Migrate legacy credentials if needed (no accounts array, or empty array with legacy token)
    if (!credentials.accounts || credentials.accounts.length === 0) {
      credentials.accounts = []
      if (credentials.token) {
        credentials.accounts.push({
          name: 'default',
          token: credentials.token,
          apiUrlOverride: credentials.apiUrlOverride,
        })
        delete credentials.token
        delete credentials.apiUrlOverride
      }
    }

    // Add or update the account
    const existingIndex = credentials.accounts.findIndex(a => a.name === account.name)
    if (existingIndex >= 0) {
      credentials.accounts[existingIndex] = account
    }
    else {
      credentials.accounts.push(account)
    }

    // Set as active if it's the first account or if there's no active account
    if (!credentials.activeAccount) {
      credentials.activeAccount = account.name
    }

    this.writeCredentials(credentials)
  }

  async switchAccount(name: string): Promise<boolean> {
    logger.debug('switchAccount', { name })
    const credentials = this.readCredentials()

    // Handle legacy format (no accounts or empty array with token)
    if ((!credentials.accounts || credentials.accounts.length === 0) && credentials.token) {
      if (name === 'default') {
        return true // Already on the only account
      }
      return false // Account not found
    }

    const account = credentials.accounts?.find(a => a.name === name)
    if (!account) {
      return false
    }

    credentials.activeAccount = name
    this.writeCredentials(credentials)
    return true
  }

  async removeAccount(name: string): Promise<boolean> {
    logger.debug('removeAccount', { name })
    const credentials = this.readCredentials()

    if (!credentials.accounts || credentials.accounts.length === 0) {
      // Handle legacy format
      if (name === 'default' && credentials.token) {
        delete credentials.token
        delete credentials.apiUrlOverride
        this.writeCredentials(credentials)
        return true
      }
      return false
    }

    const accountIndex = credentials.accounts.findIndex(a => a.name === name)
    if (accountIndex < 0) {
      return false
    }

    credentials.accounts.splice(accountIndex, 1)

    // If we removed the active account, switch to another one
    if (credentials.activeAccount === name) {
      credentials.activeAccount = credentials.accounts[0]?.name
    }

    this.writeCredentials(credentials)
    return true
  }

  private readCredentials(): StoredCredentials {
    if (!existsSync(this.credentialsPath)) {
      return {}
    }
    try {
      const content = readFileSync(this.credentialsPath, 'utf-8')
      return JSON.parse(content) as StoredCredentials
    }
    catch {
      return {}
    }
  }

  private writeCredentials(credentials: StoredCredentials): void {
    const content = JSON.stringify(credentials, null, 2)
    writeFileSync(this.credentialsPath, content, { mode: 0o600 })
  }
}
