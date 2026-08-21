import { ApiClient } from './api'
import { AuthService, CredentialStore } from './auth'
import { ChatService } from './chat'
import { CustomCommandService } from './commands'
import { createGetApiBaseUrl, createGetWsBaseUrl, getConfigManager, getRequestTimeoutMs } from './config'
import { logger } from './logger'
import { AgentRunService } from './runs'
import { SettingsService } from './settings'
import { SkillCloudClient, SkillService } from './skill'

export interface Services {
  credentialStore: CredentialStore
  auth: AuthService
  api: ApiClient
  runService: AgentRunService
  settingsService: SettingsService
  chatService: ChatService
  commandService: CustomCommandService
  skillService: SkillService
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

  const credentialStore = new CredentialStore()
  const auth = new AuthService(credentialStore)
  const api = new ApiClient({
    getBaseUrl: createGetApiBaseUrl(auth),
    getTimeoutMs: getRequestTimeoutMs,
    tokenProvider: auth,
    onUnauthorized: () => {
      logger.warn('Session expired or revoked')
      void auth.handleUnauthorizedResponse()
    },
  })

  auth.useApiClient(api)
  await auth.initialize()
  const runService = new AgentRunService(
    api,
    createGetWsBaseUrl(auth),
    createGetApiBaseUrl(auth),
  )
  const settingsService = new SettingsService(api)
  const chatService = new ChatService(runService)
  const commandService = new CustomCommandService(api)
  await commandService.loadLocal()
  const skillService = new SkillService()
  await skillService.loadAll()

  if (await auth.isAuthenticated()) {
    const config = await getConfigManager().getConfigAsync()
    if (config.skills?.cloud?.autoSync !== false) {
      const cloud = new SkillCloudClient(api)
      cloud.sync(skillService.all()).catch((err) => {
        logger.warn(`Background skill sync failed: ${err instanceof Error ? err.message : String(err)}`)
      })
    }
  }

  logger.info('Services initialized successfully')

  return { credentialStore, auth, api, runService, settingsService, chatService, commandService, skillService }
}
