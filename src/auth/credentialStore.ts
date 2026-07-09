import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logger } from '../logger'

/**
 * Credentials stored in the credential file.
 */
interface StoredCredentials {
  token?: string
  apiUrlOverride?: string
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

  /** Get the stored access token. */
  async getToken(): Promise<string | undefined> {
    const credentials = this.readCredentials()
    return credentials.token
  }

  /** Store the access token. */
  async setToken(token: string): Promise<void> {
    const credentials = this.readCredentials()
    credentials.token = token
    this.writeCredentials(credentials)
  }

  /** Clear the stored access token. */
  async clearToken(): Promise<void> {
    const credentials = this.readCredentials()
    delete credentials.token
    this.writeCredentials(credentials)
  }

  /** Get the stored API URL override. */
  async getApiUrlOverride(): Promise<string | undefined> {
    const credentials = this.readCredentials()
    return credentials.apiUrlOverride
  }

  /** Store the API URL override. */
  async setApiUrlOverride(url: string): Promise<void> {
    logger.debug('setApiUrlOverride', { url })
    const credentials = this.readCredentials()
    credentials.apiUrlOverride = url
    this.writeCredentials(credentials)
  }

  /** Clear the stored API URL override. */
  async clearApiUrlOverride(): Promise<void> {
    logger.debug('clearApiUrlOverride')
    const credentials = this.readCredentials()
    delete credentials.apiUrlOverride
    this.writeCredentials(credentials)
  }

  /** Clear all stored credentials. */
  async clearAll(): Promise<void> {
    if (existsSync(this.credentialsPath)) {
      unlinkSync(this.credentialsPath)
    }
  }

  /** Read credentials from the file. Returns empty object if file doesn't exist. */
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

  /** Write credentials to the file with restricted permissions. */
  private writeCredentials(credentials: StoredCredentials): void {
    const content = JSON.stringify(credentials, null, 2)
    writeFileSync(this.credentialsPath, content, { mode: 0o600 })
  }
}
