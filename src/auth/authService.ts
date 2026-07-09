import type { ApiClient } from '../api/apiClient'
import type { TokenProvider } from '../api/types'
import type { CredentialStore } from './credentialStore'
import { createHash } from 'node:crypto'
import { UnauthorizedError } from '../api/errors'
import { logger } from '../logger'

/** Whether an access token is currently stored. */
export type AuthStatus = 'signedIn' | 'signedOut'

/** Payload emitted whenever the authentication state changes. */
export interface AuthStateChange {
  status: AuthStatus
}

/**
 * Endpoint used to validate a candidate access token.
 *
 * `/external/me` is a purpose-built identity endpoint on the bearer-guarded
 * `/external/*` API: it returns 200 with the caller's org/token identity for a
 * valid token and 401 for an invalid one, with no domain-data serialization.
 */
const VALIDATION_ENDPOINT = '/external/me'

/**
 * Shape of an assembled access token: `<prefix>_<32-hex uid>.<hex secret>`
 * (see the backend `assembleSecretKey`). Checked client-side so malformed input
 * is rejected before it reaches the backend.
 */
const ACCESS_TOKEN_PATTERN = /^[a-z0-9]+_[0-9a-f]{32}\.[0-9a-f]{16,}$/i

/** Event listener type for auth state changes. */
export type AuthStateChangeListener = (change: AuthStateChange) => void

/**
 * Owns the CLI's authentication state.
 *
 * The single source of truth is the credential store (file-based), which
 * persists tokens securely. State is derived from storage rather than cached.
 *
 * Implements {@link TokenProvider} so it can back the {@link ApiClient} directly.
 */
export class AuthService implements TokenProvider {
  private readonly listeners: Set<AuthStateChangeListener> = new Set()

  /** Injected post-construction to break the ApiClient <-> AuthService cycle. */
  private api?: ApiClient

  /** Guards against overlapping 401 handling from concurrent requests. */
  private handlingUnauthorized = false

  constructor(private readonly credentialStore: CredentialStore) {}

  /**
   * Subscribe to authentication state changes.
   * @returns Unsubscribe function.
   */
  onDidChangeAuthentication(listener: AuthStateChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Provide the client used to validate candidate tokens. Called once during
   * initialization, after both objects are constructed.
   */
  useApiClient(api: ApiClient): void {
    this.api = api
  }

  /** Initialize the auth service. Call once on startup. */
  async initialize(): Promise<void> {
    await this.emitState()
  }

  /** The stored access token, or `undefined` when signed out. */
  async getToken(): Promise<string | undefined> {
    return this.credentialStore.getToken()
  }

  /**
   * The stored API URL override, or `undefined` if using the default.
   * Used by config to apply per-session API URL overrides.
   */
  async getApiUrlOverride(): Promise<string | undefined> {
    return this.credentialStore.getApiUrlOverride()
  }

  /** Set the API URL override. */
  async setApiUrlOverride(url: string): Promise<void> {
    return this.credentialStore.setApiUrlOverride(url)
  }

  /** Clear the API URL override. */
  async clearApiUrlOverride(): Promise<void> {
    return this.credentialStore.clearApiUrlOverride()
  }

  /** Whether a token is currently stored. */
  async isAuthenticated(): Promise<boolean> {
    return Boolean(await this.getToken())
  }

  /**
   * A stable, non-sensitive fingerprint of the signed-in account's token.
   *
   * Used to detect account switches and drop previous account's data.
   * It's a one-way SHA-256 hash: no token material is exposed.
   * Returns `undefined` when signed out.
   */
  async getAccountFingerprint(): Promise<string | undefined> {
    const token = await this.getToken()
    if (!token) {
      return undefined
    }
    return createHash('sha256').update(token).digest('hex').slice(0, 16)
  }

  /**
   * Validate `rawToken` against the backend and, if valid, persist it.
   *
   * @param rawToken - The access token to validate and store
   * @param apiUrlOverride - Optional custom API URL (for self-hosted instances)
   * @throws {UnauthorizedError} if the token is rejected
   * @throws {ApiError | NetworkError} if validation could not complete
   * @throws {Error} if the token is empty
   */
  async signIn(rawToken: string, apiUrlOverride?: string): Promise<void> {
    logger.debug('signIn', { hasToken: !!rawToken, hasApiUrlOverride: !!apiUrlOverride })
    const token = rawToken.trim()
    if (!token) {
      throw new Error('Access token must not be empty.')
    }
    if (!ACCESS_TOKEN_PATTERN.test(token)) {
      throw new Error(
        'That does not look like a WorkflowFiesta access token (expected "wf_…." format). Copy it again from the web app.',
      )
    }

    // Store the API URL override first (if provided) so validation uses it.
    if (apiUrlOverride) {
      await this.credentialStore.setApiUrlOverride(apiUrlOverride)
    }
    else {
      await this.credentialStore.clearApiUrlOverride()
    }

    try {
      await this.validateToken(token)
    }
    catch (err) {
      // Rollback the API URL override on validation failure.
      await this.credentialStore.clearApiUrlOverride()
      throw err
    }

    await this.credentialStore.setToken(token)
    await this.emitState()
  }

  /** Remove the stored token and any API URL override. No-op if already signed out. */
  async signOut(): Promise<void> {
    logger.debug('signOut')
    await this.credentialStore.clearToken()
    await this.credentialStore.clearApiUrlOverride()
    await this.emitState()
  }

  /**
   * React to a 401 on a stored-token request by clearing the invalid session.
   * Wired to `ApiClient.onUnauthorized`.
   */
  async handleUnauthorizedResponse(): Promise<void> {
    logger.debug('handleUnauthorizedResponse')
    if (this.handlingUnauthorized) {
      return
    }
    this.handlingUnauthorized = true
    try {
      if (!(await this.isAuthenticated())) {
        return
      }
      await this.signOut()
    }
    finally {
      this.handlingUnauthorized = false
    }
  }

  /**
   * Probe the validation endpoint with an explicit token. Throws on any
   * failure — a 200 is required to consider the token valid.
   */
  private async validateToken(token: string): Promise<void> {
    if (!this.api) {
      throw new Error('AuthService.useApiClient() must be called before signing in.')
    }
    await this.api.get(VALIDATION_ENDPOINT, { token })
  }

  /** Emit the current auth state to all listeners. */
  private async emitState(): Promise<void> {
    const status: AuthStatus = (await this.isAuthenticated()) ? 'signedIn' : 'signedOut'
    const change: AuthStateChange = { status }
    for (const listener of this.listeners) {
      listener(change)
    }
  }
}

// Re-exported for callers that branch on the auth failure type.
export { UnauthorizedError }
