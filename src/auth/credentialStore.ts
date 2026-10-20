import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logger } from '../logger'
import { keychainDelete, KeychainError, keychainRead, keychainWrite } from '../utils/keychain'

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

export const KEYCHAIN_SERVICE = 'WorkflowFiesta-credentials'

/**
 * Credential storage shared with the VS Code extension.
 *
 * - macOS: one Keychain item (`WorkflowFiesta-credentials`) holding the JSON.
 *   After each write, `credentials.changed` is touched in the config dir so
 *   the extension can watch for changes. An existing `credentials.json` is
 *   moved into the Keychain on first read.
 * - Other platforms: `~/.config/workflowfiesta/cli/credentials.json`, mode 0600.
 *
 * The storage, format and active-account rules MUST stay in sync with
 * vscode extension.
 */
export class CredentialStore {
  private readonly credentialsPath: string
  private readonly changedPath: string

  /**
   * @param configDir - Directory for the credentials file (default `~/.config/workflowfiesta/cli`)
   * @param keychainService - Keychain service to use, or `null` for the file. Defaults to the Keychain on macOS.
   */
  constructor(
    configDir?: string,
    private readonly keychainService: string | null = process.platform === 'darwin' ? KEYCHAIN_SERVICE : null,
  ) {
    const baseDir = configDir ?? join(homedir(), '.config', 'workflowfiesta', 'cli')
    this.credentialsPath = join(baseDir, 'credentials.json')
    this.changedPath = join(baseDir, 'credentials.changed')

    // Ensure the config directory exists
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true, mode: 0o700 })
    }
  }

  isFirstRun(): boolean {
    if (this.keychainService && keychainRead(this.keychainService) !== undefined) {
      return false
    }
    return !existsSync(this.credentialsPath)
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
      delete credentials.apiUrlOverride
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
    if (this.keychainService) {
      keychainDelete(this.keychainService)
      this.touchChanged()
    }
    rmSync(this.credentialsPath, { force: true })
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
    try {
      return JSON.parse(this.readRaw() ?? '{}') as StoredCredentials
    }
    catch (err) {
      // A Keychain failure (e.g. access denied) must surface: returning {}
      // here would let the next write wipe every stored account.
      if (err instanceof KeychainError) {
        throw err
      }
      return {}
    }
  }

  private readRaw(): string | undefined {
    if (!this.keychainService) {
      return existsSync(this.credentialsPath) ? readFileSync(this.credentialsPath, 'utf-8') : undefined
    }
    const stored = keychainRead(this.keychainService)
    if (stored !== undefined || !existsSync(this.credentialsPath)) {
      return stored
    }
    const fromFile = readFileSync(this.credentialsPath, 'utf-8')
    keychainWrite(this.keychainService, fromFile)
    rmSync(this.credentialsPath)
    logger.debug('Moved credentials file into the macOS Keychain')
    return fromFile
  }

  private writeCredentials(credentials: StoredCredentials): void {
    if (this.keychainService) {
      keychainWrite(this.keychainService, JSON.stringify(credentials))
      this.touchChanged()
      return
    }
    const tmp = `${this.credentialsPath}.${process.pid}.tmp`
    writeFileSync(tmp, JSON.stringify(credentials, null, 2), { mode: 0o600 })
    renameSync(tmp, this.credentialsPath)
  }

  private touchChanged(): void {
    writeFileSync(this.changedPath, String(Date.now()), { mode: 0o600 })
  }
}
