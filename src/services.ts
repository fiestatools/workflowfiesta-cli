import { ApiClient } from './api'
import { AuthService, CredentialStore } from './auth'
import { ChatService } from './chat'
import { createGetApiBaseUrl, createGetWsBaseUrl, getRequestTimeoutMs } from './config'
import { logger } from './logger'
import { AgentRunService } from './runs'

/**
 * Application services initialized on startup.
 */
export interface Services {
  /** Credential storage for auth tokens. */
  credentialStore: CredentialStore
  /** Authentication service. */
  auth: AuthService
  /** HTTP API client. */
  api: ApiClient
  /** Agent run service. */
  runService: AgentRunService
  /** Chat service. */
  chatService: ChatService
}

/**
 * Initialize all application services.
 *
 * Sets up the dependency graph:
 * - CredentialStore (standalone)
 * - AuthService (depends on CredentialStore)
 * - ApiClient (depends on AuthService for token provider)
 * - Wire ApiClient back to AuthService for validation
 */
export async function initializeServices(): Promise<Services> {
  logger.info('Initializing services')

  // Create credential store
  const credentialStore = new CredentialStore()

  // Create auth service
  const auth = new AuthService(credentialStore)

  // Create API client
  const api = new ApiClient({
    getBaseUrl: createGetApiBaseUrl(auth),
    getTimeoutMs: getRequestTimeoutMs,
    tokenProvider: auth,
    onUnauthorized: () => {
      logger.warn('Session expired or revoked')
      void auth.handleUnauthorizedResponse()
    },
  })

  // Wire API client back to auth service for token validation
  auth.useApiClient(api)

  // Initialize auth service (loads current state)
  await auth.initialize()

  // Create run service
  const runService = new AgentRunService(
    api,
    createGetWsBaseUrl(auth),
    createGetApiBaseUrl(auth),
  )

  // Create chat service
  const chatService = new ChatService(runService)

  logger.info('Services initialized successfully')

  return { credentialStore, auth, api, runService, chatService }
}
